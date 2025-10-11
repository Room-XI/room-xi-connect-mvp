import { supabase } from './supabase';
import { addToQueue } from './queue';

/**
 * Record attendance for a program using the user's XID
 * This function handles both online and offline scenarios
 */
export async function recordAttendance(
  programId: string,
  method: 'qr' | 'manual',
  site?: string
): Promise<void> {
  try {
    // First, get the user's XID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the user's active XID
    const { data: xidData, error: xidError } = await supabase
      .from('xids')
      .select('id')
      .eq('user_id', user.id)
      .is('tombstoned_at', null)
      .single();

    if (xidError || !xidData) {
      // User doesn't have an XID yet - create one
      const { data: newXidData, error: createError } = await supabase.functions.invoke('xid-create');
      
      if (createError || !newXidData?.xid_id) {
        throw new Error('Failed to create XID for attendance');
      }
      
      // Use the newly created XID
      await recordAttendanceWithXID(newXidData.xid_id, programId, method, site);
    } else {
      // Use existing XID
      await recordAttendanceWithXID(xidData.id, programId, method, site);
    }
  } catch (error) {
    console.error('Error recording attendance:', error);
    throw error;
  }
}

/**
 * Record attendance with a specific XID
 */
async function recordAttendanceWithXID(
  xidId: string,
  programId: string,
  method: 'qr' | 'manual',
  site?: string
): Promise<void> {
  const attendanceData = {
    xid_id: xidId,
    program_id: programId,
    timestamp: new Date().toISOString(),
    method,
    site: site || null,
  };

  try {
    // Try to record immediately if online
    if (navigator.onLine) {
      await supabase.from('attendance').insert(attendanceData);
    } else {
      // Offline - queue for later sync
      await addToQueue('attendance', attendanceData);
    }
  } catch (error) {
    // If immediate recording fails, queue it for offline sync
    console.log('Immediate attendance recording failed, queuing for later:', error);
    await addToQueue('attendance', attendanceData);
  }
}

/**
 * Get attendance history for the current user
 */
export async function getAttendanceHistory(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Get attendance records through the user's XIDs
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        timestamp,
        method,
        site,
        programs (
          id,
          title,
          organizer,
          location_name
        )
      `)
      .in('xid_id', 
        supabase
          .from('xids')
          .select('id')
          .eq('user_id', user.id)
          .is('tombstoned_at', null)
      )
      .order('timestamp', { ascending: false })
      .limit(50); // Limit to recent attendance

    if (error) {
      console.error('Error fetching attendance history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching attendance history:', error);
    return [];
  }
}

/**
 * Get attendance count for the current user
 */
export async function getAttendanceCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 0;
    }

    const { count, error } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .in('xid_id', 
        supabase
          .from('xids')
          .select('id')
          .eq('user_id', user.id)
          .is('tombstoned_at', null)
      );

    if (error) {
      console.error('Error fetching attendance count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Unexpected error fetching attendance count:', error);
    return 0;
  }
}

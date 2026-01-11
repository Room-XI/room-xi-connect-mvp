import express from 'express';
import { db } from '../db.js';
import { programEvents, programs, checkins } from '../schema.js';
import { eq, and, or, sql, inArray, isNull, lte, gte, desc } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { getRecommendationsWithContext } from '../services/recommendations.ts';
import { debugLog } from '../utils/logger.ts';
import { requireResearchConsent } from '../middleware/consent.ts';
import logger from '../logger.ts';

const router = express.Router();

const DAY_ORDER = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function formatEventWithProgram(event, program, userLat = null, userLng = null) {
  const result = {
    eventId: event.id,
    eventName: event.eventName,
    description: event.description,
    dayOfWeek: event.dayOfWeek,
    startTime: event.startTime,
    endTime: event.endTime,
    isDropIn: event.isDropIn,
    isRecurring: event.isRecurring,
    locationName: event.locationName || program.locationName,
    address: event.address || program.address,
    lat: event.lat || program.lat,
    lng: event.lng || program.lng,
    ageMin: event.ageMin || program.ageMin,
    ageMax: event.ageMax || program.ageMax,
    cost: event.cost || (program.free ? 'Free' : null),
    costCents: event.costCents ?? program.costCents ?? 0,
    notes: event.notes,
    facilitator: event.facilitator,
    requiresRegistration: event.requiresRegistration,
    registrationUrl: event.registrationUrl,
    capacity: event.capacity,
    programId: program.id,
    programTitle: program.title,
    programDescription: program.description,
    programTags: program.tags,
    wellnessDimensions: program.wellnessDimensions,
    organizer: program.organizer,
    contactEmail: program.contactEmail || event.registrationUrl,
    contactPhone: program.contactPhone,
    website: program.website,
  };

  // Calculate distance if user location provided
  if (userLat !== null && userLng !== null && result.lat && result.lng) {
    try {
      const eventLat = parseFloat(result.lat);
      const eventLng = parseFloat(result.lng);
      result.distance = calculateDistance(userLat, userLng, eventLat, eventLng);
    } catch (error) {
      logger.error({ err: error, context: 'events-distance-calc' }, 'Error calculating distance');
      result.distance = null;
    }
  }

  return result;
}

function sortEvents(events, userLat = null, userLng = null) {
  if (userLat !== null && userLng !== null) {
    // Sort by distance (nearest first), then by start time
    return events.sort((a, b) => {
      if (a.distance === null && b.distance === null) {
        // Both have no distance - sort by start time
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        return 0;
      }
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      
      // Compare distances
      const distanceDiff = a.distance - b.distance;
      if (distanceDiff !== 0) return distanceDiff;
      
      // Same distance - sort by start time
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      return 0;
    });
  } else {
    // Sort by day of week, then start time
    return events.sort((a, b) => {
      const dayCompare = DAY_ORDER[a.dayOfWeek] - DAY_ORDER[b.dayOfWeek];
      if (dayCompare !== 0) return dayCompare;
      
      // Compare times
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      return 0;
    });
  }
}

// GET /api/events/happening-now
// Returns events currently running at request time
router.get('/happening-now', async (req, res) => {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const currentDay = now.toFormat('EEEE'); // Monday, Tuesday, etc.
    const currentTime = now.toFormat('HH:mm:ss');
    const currentDate = now.toFormat('yyyy-MM-dd');
    
    const previousDay = now.minus({ days: 1 }).toFormat('EEEE');
    const previousDate = now.minus({ days: 1 }).toFormat('yyyy-MM-dd');
    
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

    debugLog('happening-now', `Current time in Edmonton: ${now.toISO()}, Day: ${currentDay}, Time: ${currentTime}, Date: ${currentDate}, Previous day: ${previousDay}, Previous date: ${previousDate}`);

    // Query events that are:
    // 1. Active
    // 2. Current time is between start and end time (handles overnight events)
    // 3. EITHER:
    //    a) One-time event on today's date (occurs_on_date = current_date)
    //    b) Recurring event (occurs_on_date IS NULL) on current day, within effective date range
    //    c) Overnight one-time event from previous day that's still running
    //    d) Overnight recurring event from previous day that's still running
    const activeEvents = await db
      .select()
      .from(programEvents)
      .innerJoin(programs, eq(programEvents.programId, programs.id))
      .where(
        and(
          eq(programEvents.active, true),
          // Handle overnight events: if start_time > end_time, event runs overnight
          or(
            // Normal event (ends same day): start <= current <= end
            and(
              sql`${programEvents.startTime} <= ${programEvents.endTime}`,
              sql`${programEvents.startTime} <= ${currentTime}::time`,
              sql`${programEvents.endTime} >= ${currentTime}::time`
            ),
            // Overnight event (ends next day): current >= start OR current <= end
            and(
              sql`${programEvents.startTime} > ${programEvents.endTime}`,
              or(
                sql`${programEvents.startTime} <= ${currentTime}::time`,
                sql`${currentTime}::time <= ${programEvents.endTime}`
              )
            )
          ),
          or(
            // One-time event happening today
            eq(programEvents.occursOnDate, new Date(currentDate)),
            // One-time overnight event from previous day that's still running
            and(
              eq(programEvents.occursOnDate, new Date(previousDate)),
              sql`${programEvents.startTime} > ${programEvents.endTime}`,
              sql`${currentTime}::time <= ${programEvents.endTime}`
            ),
            // Recurring event on current day within effective date range
            and(
              isNull(programEvents.occursOnDate),
              eq(programEvents.dayOfWeek, currentDay),
              or(
                isNull(programEvents.effectiveFrom),
                lte(programEvents.effectiveFrom, new Date(currentDate))
              ),
              or(
                isNull(programEvents.effectiveTo),
                gte(programEvents.effectiveTo, new Date(currentDate))
              )
            ),
            // Recurring overnight event from previous day that's still running
            and(
              isNull(programEvents.occursOnDate),
              eq(programEvents.dayOfWeek, previousDay),
              sql`${programEvents.startTime} > ${programEvents.endTime}`,
              sql`${currentTime}::time <= ${programEvents.endTime}`,
              or(
                isNull(programEvents.effectiveFrom),
                lte(programEvents.effectiveFrom, new Date(previousDate))
              ),
              or(
                isNull(programEvents.effectiveTo),
                gte(programEvents.effectiveTo, new Date(previousDate))
              )
            )
          )
        )
      );

    debugLog('happening-now', `Found ${activeEvents.length} events`);

    const formattedEvents = activeEvents.map(row => 
      formatEventWithProgram(row.program_events, row.programs, userLat, userLng)
    );

    const sortedEvents = sortEvents(formattedEvents, userLat, userLng);

    res.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: now.toISO(),
      filter: 'happening-now'
    });
  } catch (error) {
    logger.error({ err: error, context: 'events-happening-now' }, 'Error fetching happening now events');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/today
// Returns ALL events for today (past, current, and future)
router.get('/today', async (req, res) => {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const currentDay = now.toFormat('EEEE');
    const currentDate = now.toFormat('yyyy-MM-dd');
    
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

    debugLog('today', `Current time in Edmonton: ${now.toISO()}, Day: ${currentDay}, Date: ${currentDate}`);

    // Query events that are:
    // 1. Active
    // 2. EITHER:
    //    a) One-time event on today's date (occurs_on_date = current_date)
    //    b) Recurring event (occurs_on_date IS NULL) on current day, within effective date range
    // NOTE: Excludes overnight events that started yesterday
    const todayEvents = await db
      .select()
      .from(programEvents)
      .innerJoin(programs, eq(programEvents.programId, programs.id))
      .where(
        and(
          eq(programEvents.active, true),
          or(
            // One-time event happening today
            eq(programEvents.occursOnDate, new Date(currentDate)),
            // Recurring event on current day within effective date range
            and(
              isNull(programEvents.occursOnDate),
              eq(programEvents.dayOfWeek, currentDay),
              or(
                isNull(programEvents.effectiveFrom),
                lte(programEvents.effectiveFrom, new Date(currentDate))
              ),
              or(
                isNull(programEvents.effectiveTo),
                gte(programEvents.effectiveTo, new Date(currentDate))
              )
            )
          )
        )
      );

    debugLog('today', `Found ${todayEvents.length} events`);

    const formattedEvents = todayEvents.map(row => 
      formatEventWithProgram(row.program_events, row.programs, userLat, userLng)
    );

    const sortedEvents = sortEvents(formattedEvents, userLat, userLng);

    res.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: now.toISO(),
      filter: 'today'
    });
  } catch (error) {
    logger.error({ err: error, context: 'events-today' }, 'Error fetching today events');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/this-weekend
// Returns Saturday and Sunday events
router.get('/this-weekend', async (req, res) => {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const currentDate = now.toFormat('yyyy-MM-dd');
    
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

    // Calculate next Saturday and Sunday dates
    const currentDayOfWeek = now.weekday; // 1 = Monday, 7 = Sunday
    const daysUntilSaturday = (6 - currentDayOfWeek + 7) % 7 || 7; // Saturday = 6
    const daysUntilSunday = (7 - currentDayOfWeek + 7) % 7 || 7; // Sunday = 7
    
    const nextSaturday = now.plus({ days: daysUntilSaturday }).toFormat('yyyy-MM-dd');
    const nextSunday = now.plus({ days: daysUntilSunday }).toFormat('yyyy-MM-dd');

    debugLog('this-weekend', `Current date: ${currentDate}, Next Saturday: ${nextSaturday}, Next Sunday: ${nextSunday}`);

    // Query events that are:
    // 1. Active
    // 2. EITHER:
    //    a) One-time event on next Saturday or Sunday (occurs_on_date IN [nextSaturday, nextSunday])
    //    b) Recurring event (occurs_on_date IS NULL) on Saturday/Sunday, within effective date range
    const weekendEvents = await db
      .select()
      .from(programEvents)
      .innerJoin(programs, eq(programEvents.programId, programs.id))
      .where(
        and(
          eq(programEvents.active, true),
          or(
            // One-time events happening on next Saturday or Sunday
            inArray(programEvents.occursOnDate, [new Date(nextSaturday), new Date(nextSunday)]),
            // Recurring weekend events within effective date range
            and(
              isNull(programEvents.occursOnDate),
              inArray(programEvents.dayOfWeek, ['Saturday', 'Sunday']),
              or(
                isNull(programEvents.effectiveFrom),
                lte(programEvents.effectiveFrom, new Date(nextSunday)) // Effective by Sunday at latest
              ),
              or(
                isNull(programEvents.effectiveTo),
                gte(programEvents.effectiveTo, new Date(nextSaturday)) // Still effective by Saturday
              )
            )
          )
        )
      );

    debugLog('this-weekend', `Found ${weekendEvents.length} events`);

    const formattedEvents = weekendEvents.map(row => 
      formatEventWithProgram(row.program_events, row.programs, userLat, userLng)
    );

    const sortedEvents = sortEvents(formattedEvents, userLat, userLng);

    res.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: now.toISO(),
      filter: 'this-weekend',
      weekendDates: { saturday: nextSaturday, sunday: nextSunday }
    });
  } catch (error) {
    logger.error({ err: error, context: 'events-this-weekend' }, 'Error fetching this weekend events');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/later
// Returns upcoming events in next 7 days (ordered by day/time)
router.get('/later', async (req, res) => {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const currentDate = now.toFormat('yyyy-MM-dd');
    const currentDay = now.toFormat('EEEE');
    
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

    // Calculate date range: tomorrow to tomorrow+6 days (total 7 days)
    const startDate = now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
    const endDate = now.plus({ days: 7 }).toFormat('yyyy-MM-dd');

    // Get next 7 days of week starting from tomorrow
    const nextSevenDays = [];
    for (let i = 1; i <= 7; i++) {
      const futureDate = now.plus({ days: i });
      nextSevenDays.push(futureDate.toFormat('EEEE'));
    }

    debugLog('later', `Date range: ${startDate} to ${endDate}, Days: ${nextSevenDays.join(', ')}`);

    // Query all active events in the next 7 days
    // EITHER:
    //   a) One-time events where occurs_on_date is between tomorrow and +7 days
    //   b) Recurring events on matching days within effective date range
    const upcomingEvents = await db
      .select()
      .from(programEvents)
      .innerJoin(programs, eq(programEvents.programId, programs.id))
      .where(
        and(
          eq(programEvents.active, true),
          or(
            // One-time events within the next 7 days
            and(
              gte(programEvents.occursOnDate, new Date(startDate)),
              lte(programEvents.occursOnDate, new Date(endDate))
            ),
            // Recurring events on matching days within effective date range
            and(
              isNull(programEvents.occursOnDate),
              inArray(programEvents.dayOfWeek, nextSevenDays),
              or(
                isNull(programEvents.effectiveFrom),
                lte(programEvents.effectiveFrom, new Date(endDate)) // Effective by end of range
              ),
              or(
                isNull(programEvents.effectiveTo),
                gte(programEvents.effectiveTo, new Date(startDate)) // Still effective at start of range
              )
            )
          )
        )
      );

    debugLog('later', `Found ${upcomingEvents.length} events`);

    const formattedEvents = upcomingEvents.map(row => 
      formatEventWithProgram(row.program_events, row.programs, userLat, userLng)
    );

    // Sort by day order (soonest first), then by start time
    const sortedEvents = formattedEvents.sort((a, b) => {
      const aIndex = nextSevenDays.indexOf(a.dayOfWeek);
      const bIndex = nextSevenDays.indexOf(b.dayOfWeek);
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      // Same day - sort by start time
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      
      // If distance is available and days/times are same, sort by distance
      if (userLat !== null && userLng !== null) {
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
      }
      
      return 0;
    });

    res.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: now.toISO(),
      filter: 'later',
      dateRange: { start: startDate, end: endDate },
      daysIncluded: nextSevenDays
    });
  } catch (error) {
    logger.error({ err: error, context: 'events-later' }, 'Error fetching later events');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: Format time to 12-hour format (e.g., "4pm", "10:30am")
function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const hour = hours % 12 || 12;
  const ampm = hours >= 12 ? 'pm' : 'am';
  return minutes === 0 ? `${hour}${ampm}` : `${hour}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

// Helper: Get short day name
function getShortDayName(dayOfWeek) {
  const dayMap = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };
  return dayMap[dayOfWeek] || dayOfWeek;
}

// Helper: Check if event is overnight (between 22:00 and 06:00 or start > end)
function isOvernightEvent(startTime, endTime) {
  if (!startTime || !endTime) return false;
  
  const [startHour] = startTime.split(':').map(Number);
  const [endHour] = endTime.split(':').map(Number);
  
  // Start time is after end time (crosses midnight)
  if (startTime > endTime) return true;
  
  // Starts between 10pm and 6am
  if (startHour >= 22 || startHour < 6) return true;
  
  return false;
}

// Helper: Get time-of-day category from start time
function getTimeOfDay(startTime) {
  if (!startTime) return null;
  const [hours] = startTime.split(':').map(Number);
  if (hours < 12) return 'morning';       // Before 12pm
  if (hours < 17) return 'afternoon';     // 12pm - 5pm
  return 'evening';                        // 5pm and after
}

// Helper: Build weekly schedule summary from grouped events
function buildScheduleSummary(schedules) {
  if (!schedules || schedules.length === 0) return '';
  
  // Group schedules by time slot
  const timeGroups = {};
  
  for (const schedule of schedules) {
    const timeKey = `${schedule.startTime}-${schedule.endTime}`;
    if (!timeGroups[timeKey]) {
      timeGroups[timeKey] = {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        days: []
      };
    }
    for (const day of schedule.days) {
      if (!timeGroups[timeKey].days.includes(day)) {
        timeGroups[timeKey].days.push(day);
      }
    }
  }
  
  // Sort days within each group
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (const key of Object.keys(timeGroups)) {
    timeGroups[key].days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  }
  
  // Build summary strings
  const summaries = [];
  for (const group of Object.values(timeGroups)) {
    const timeStr = `${formatTimeTo12Hour(group.startTime)}-${formatTimeTo12Hour(group.endTime)}`;
    const shortDays = group.days.map(getShortDayName);
    
    let dayStr;
    if (shortDays.length === 1) {
      dayStr = shortDays[0];
    } else if (shortDays.length === 2) {
      dayStr = `${shortDays[0]} & ${shortDays[1]}`;
    } else {
      dayStr = shortDays.join(', ');
    }
    
    summaries.push(`${dayStr} ${timeStr}`);
  }
  
  return summaries.join(' • ');
}

// GET /api/events/programs-grouped
// Returns programs with their weekly schedules grouped (for Programs tab)
// Excludes overnight events and shows each program once
router.get('/programs-grouped', async (req, res) => {
  try {
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;
    const isAuthenticated = !!(req.session && req.session.userId);

    const now = DateTime.now().setZone('America/Edmonton');
    const currentDate = now.toFormat('yyyy-MM-dd');

    // Query all active events
    let query = db
      .select()
      .from(programEvents)
      .innerJoin(programs, eq(programEvents.programId, programs.id))
      .where(eq(programEvents.active, true));

    if (!isAuthenticated) {
      // Guest users: Show events for the next 30 days
      const windowStart = now.startOf('day').toJSDate();
      const windowEnd = now.plus({ days: 30 }).endOf('day').toJSDate();
      
      query = db
        .select()
        .from(programEvents)
        .innerJoin(programs, eq(programEvents.programId, programs.id))
        .where(
          and(
            eq(programEvents.active, true),
            or(
              // Recurring events within effective date range
              and(
                isNull(programEvents.occursOnDate),
                or(
                  isNull(programEvents.effectiveFrom),
                  lte(programEvents.effectiveFrom, windowEnd)
                ),
                or(
                  isNull(programEvents.effectiveTo),
                  gte(programEvents.effectiveTo, windowStart)
                )
              ),
              // One-time events within next 30 days
              and(
                sql`${programEvents.occursOnDate} IS NOT NULL`,
                gte(programEvents.occursOnDate, windowStart),
                lte(programEvents.occursOnDate, windowEnd)
              )
            )
          )
        );
    }

    const results = await query;

    // Group events by programId
    const programMap = new Map();

    for (const { program_events: event, programs: program } of results) {
      // Skip overnight events
      if (isOvernightEvent(event.startTime, event.endTime)) {
        continue;
      }

      const programId = program.id;
      
      if (!programMap.has(programId)) {
        // Initialize program entry
        let distance = null;
        if (userLat !== null && userLng !== null && program.lat && program.lng) {
          try {
            const programLat = parseFloat(program.lat);
            const programLng = parseFloat(program.lng);
            distance = calculateDistance(userLat, userLng, programLat, programLng);
          } catch (e) {
            logger.error({ err: e, context: 'events-distance-calc' }, 'Error calculating distance');
          }
        }

        programMap.set(programId, {
          programId: program.id,
          programTitle: program.title,
          programDescription: program.description,
          programTags: program.tags || [],
          wellnessDimensions: program.wellnessDimensions || [],
          organizer: program.organizer,
          contactEmail: program.contactEmail,
          contactPhone: program.contactPhone,
          website: program.website,
          locationName: program.locationName,
          address: program.address,
          lat: program.lat,
          lng: program.lng,
          ageMin: program.ageMin,
          ageMax: program.ageMax,
          free: program.free,
          costCents: program.costCents || 0,
          isDropIn: program.dropIn || false,
          indoor: program.indoor || false,
          outdoor: program.outdoor || false,
          distance: distance,
          weeklySchedule: [],
          events: [],
          _timesOfDaySet: new Set()
        });
      }

      const programEntry = programMap.get(programId);
      
      // Track time-of-day for this event
      const timeOfDay = getTimeOfDay(event.startTime);
      if (timeOfDay) {
        programEntry._timesOfDaySet.add(timeOfDay);
      }
      
      // Add event to the program's events list
      programEntry.events.push({
        eventId: event.id,
        dayOfWeek: event.dayOfWeek,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName || program.locationName,
        isDropIn: event.isDropIn,
        isRecurring: event.isRecurring,
        occursOnDate: event.occursOnDate
      });
    }

    // Build weekly schedules for each program
    for (const programEntry of programMap.values()) {
      // Group events by time slot and location
      const scheduleMap = new Map();
      
      for (const event of programEntry.events) {
        const key = `${event.startTime}-${event.endTime}-${event.locationName || 'default'}`;
        
        if (!scheduleMap.has(key)) {
          scheduleMap.set(key, {
            days: [],
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.locationName || programEntry.locationName,
            isDropIn: event.isDropIn
          });
        }
        
        const schedule = scheduleMap.get(key);
        if (event.dayOfWeek && !schedule.days.includes(event.dayOfWeek)) {
          schedule.days.push(event.dayOfWeek);
        }
      }
      
      // Sort days in each schedule
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const schedule of scheduleMap.values()) {
        schedule.days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      }
      
      programEntry.weeklySchedule = Array.from(scheduleMap.values());
      programEntry.scheduleSummary = buildScheduleSummary(programEntry.weeklySchedule);
      
      // Set isDropIn based on any event being drop-in
      programEntry.isDropIn = programEntry.events.some(e => e.isDropIn);
      
      // Convert timesOfDay Set to sorted array
      programEntry.timesOfDay = Array.from(programEntry._timesOfDaySet).sort((a, b) => {
        const order = { morning: 1, afternoon: 2, evening: 3 };
        return order[a] - order[b];
      });
      
      // Clean up - remove raw events array and internal Set from response
      delete programEntry.events;
      delete programEntry._timesOfDaySet;
    }

    // Convert to array and sort
    let programsList = Array.from(programMap.values());

    // Sort by distance if available, otherwise alphabetically
    if (userLat !== null && userLng !== null) {
      programsList.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else {
      programsList.sort((a, b) => (a.programTitle || '').localeCompare(b.programTitle || ''));
    }

    res.json({
      programs: programsList,
      count: programsList.length
    });
  } catch (error) {
    logger.error({ err: error, context: 'events-programs-grouped' }, 'Error fetching grouped programs');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/program-occurrences
// Returns all active program events for browsing (used in Programs tab)
router.get('/program-occurrences', async (req, res) => {
  try {
    const isAuthenticated = !!(req.session && req.session.userId);
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

    let query = db
      .select()
      .from(programEvents)
      .innerJoin(programs, eq(programEvents.programId, programs.id))
      .where(eq(programEvents.active, true));

    if (!isAuthenticated) {
      // Guest users: Show events for the next 30 days (privacy-first with reasonable access)
      const edmontonNow = DateTime.now().setZone('America/Edmonton');
      const windowStart = edmontonNow.startOf('day').toJSDate();
      const windowEnd = edmontonNow.plus({ days: 30 }).endOf('day').toJSDate();
      
      query = query.where(
        and(
          eq(programEvents.active, true),
          or(
            // Recurring events (no specific date) within effective date range
            and(
              isNull(programEvents.occursOnDate),
              or(
                isNull(programEvents.effectiveFrom),
                lte(programEvents.effectiveFrom, windowEnd)
              ),
              or(
                isNull(programEvents.effectiveTo),
                gte(programEvents.effectiveTo, windowStart)
              )
            ),
            // One-time events within next 30 days
            and(
              sql`${programEvents.occursOnDate} IS NOT NULL`,
              gte(programEvents.occursOnDate, windowStart),
              lte(programEvents.occursOnDate, windowEnd)
            )
          )
        )
      ).limit(100); // Prevent catalog scraping
    }

    const results = await query;

    // Format events with program data
    const formattedEvents = results.map(({ program_events: event, programs: program }) =>
      formatEventWithProgram(event, program, userLat, userLng)
    );

    // Sort events
    const sortedEvents = sortEvents(formattedEvents, userLat, userLng);

    res.json(sortedEvents);
  } catch (error) {
    logger.error({ err: error, context: 'events-program-occurrences' }, 'Error fetching program occurrences');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/recommendations
// Returns personalized program recommendations based on user's mood and check-in history
// Requires research participation consent
router.get('/recommendations', requireResearchConsent(), async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.session.userId;
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : undefined;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : undefined;

    // Get user's latest check-in for current mood
    const [latestCheckin] = await db
      .select({
        moodType: checkins.moodType,
        wellnessDimensions: checkins.wellnessDimensions,
      })
      .from(checkins)
      .where(eq(checkins.userId, userId))
      .orderBy(desc(checkins.timestamp))
      .limit(1);

    if (!latestCheckin) {
      return res.json({
        recommendations: [],
        count: 0,
        message: 'Complete a check-in to get personalized recommendations'
      });
    }

    const currentMood = latestCheckin.moodType || undefined;
    const wellnessDimensions = latestCheckin.wellnessDimensions || undefined;

    // Get recommendations using the existing service
    const recommendations = await getRecommendationsWithContext(
      userId,
      currentMood,
      wellnessDimensions,
      null, // moodTrend - we skip for simplicity
      userLat,
      userLng,
      userLat !== undefined && userLng !== undefined
    );

    // Return top 3 recommendations with essential fields
    const topRecommendations = recommendations.slice(0, 3).map(rec => ({
      eventId: rec.eventId,
      programId: rec.programId,
      title: rec.eventName || rec.programTitle,
      programTitle: rec.programTitle,
      matchScore: rec.matchScore,
      triggerReason: rec.triggerReason,
      tags: rec.tags || [],
      locationName: rec.locationName,
      free: rec.free,
      cost: rec.cost,
      dayOfWeek: rec.dayOfWeek,
      startTime: rec.startTime,
      endTime: rec.endTime,
    }));

    res.json({
      recommendations: topRecommendations,
      count: topRecommendations.length,
    });
  } catch (error) {
    logger.error({ err: error, context: 'events-recommendations' }, 'Error fetching recommendations');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

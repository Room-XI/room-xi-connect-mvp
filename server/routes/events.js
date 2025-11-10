import express from 'express';
import { db } from '../db.js';
import { programEvents, programs } from '../schema.js';
import { eq, and, or, sql, inArray, isNull, lte, gte } from 'drizzle-orm';
import { DateTime } from 'luxon';

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
      console.error('Error calculating distance:', error);
      result.distance = null;
    }
  }

  return result;
}

function sortEvents(events, userLat = null, userLng = null) {
  if (userLat !== null && userLng !== null) {
    // Sort by distance (nearest first)
    return events.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
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

    console.log(`[happening-now] Current time in Edmonton: ${now.toISO()}, Day: ${currentDay}, Time: ${currentTime}, Date: ${currentDate}, Previous day: ${previousDay}, Previous date: ${previousDate}`);

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

    console.log(`[happening-now] Found ${activeEvents.length} events`);

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
    console.error('[happening-now] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/events/today
// Returns remaining events today (haven't ended yet)
router.get('/today', async (req, res) => {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const currentDay = now.toFormat('EEEE');
    const currentTime = now.toFormat('HH:mm:ss');
    const currentDate = now.toFormat('yyyy-MM-dd');
    
    const previousDay = now.minus({ days: 1 }).toFormat('EEEE');
    const previousDate = now.minus({ days: 1 }).toFormat('yyyy-MM-dd');
    
    const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
    const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

    console.log(`[today] Current time in Edmonton: ${now.toISO()}, Day: ${currentDay}, Time: ${currentTime}, Date: ${currentDate}, Previous day: ${previousDay}, Previous date: ${previousDate}`);

    // Query events that are:
    // 1. Active
    // 2. Haven't ended yet (handles overnight events)
    // 3. EITHER:
    //    a) One-time event on today's date (occurs_on_date = current_date)
    //    b) Recurring event (occurs_on_date IS NULL) on current day, within effective date range
    //    c) Overnight one-time event from previous day that's still running
    //    d) Overnight recurring event from previous day that's still running
    const todayEvents = await db
      .select()
      .from(programEvents)
      .innerJoin(programs, eq(programEvents.programId, programs.id))
      .where(
        and(
          eq(programEvents.active, true),
          // Handle overnight events: for events that haven't ended yet
          or(
            // Normal event (ends same day): end_time >= current_time
            and(
              sql`${programEvents.startTime} <= ${programEvents.endTime}`,
              sql`${programEvents.endTime} >= ${currentTime}::time`
            ),
            // Overnight event: always show on current day (will end tomorrow)
            sql`${programEvents.startTime} > ${programEvents.endTime}`
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

    console.log(`[today] Found ${todayEvents.length} events`);

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
    console.error('[today] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

    console.log(`[this-weekend] Current date: ${currentDate}, Next Saturday: ${nextSaturday}, Next Sunday: ${nextSunday}`);

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

    console.log(`[this-weekend] Found ${weekendEvents.length} events`);

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
    console.error('[this-weekend] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

    console.log(`[later] Date range: ${startDate} to ${endDate}, Days: ${nextSevenDays.join(', ')}`);

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

    console.log(`[later] Found ${upcomingEvents.length} events`);

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
    console.error('[later] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/events/program-occurrences
// Returns all active program events for browsing (used in Programs tab)
router.get('/program-occurrences', async (req, res) => {
  try {
    const isAuthenticated = !!req.session.userId;
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
    console.error('[program-occurrences] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

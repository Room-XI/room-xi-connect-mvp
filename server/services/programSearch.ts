import { db } from '../db.ts';
import { programs, programEvents, rsvps } from '../schema.ts';
import { eq, and, gte, lte, sql, or, inArray, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';
import logger from '../logger.ts';

export interface ProgramSearchOptions {
  query?: string;
  timeframe?: 'today' | 'next_7_days';
  lat?: number;
  lng?: number;
  orgId?: string;
  limit?: number;
}

export interface ProgramSearchResult {
  programId: string;
  programName: string;
  description: string | null;
  eventId: string | null;
  start: string | null;
  end: string | null;
  venue: string | null;
  dayOfWeek: string | null;
  dropIn: boolean;
  category: string | null;
}

export interface ScheduleItem {
  type: 'program_event';
  programName: string;
  title: string;
  start: string | null;
  end: string | null;
  venue: string | null;
  day: string | null;
  teamName?: string;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function searchPrograms(options: ProgramSearchOptions): Promise<ProgramSearchResult[]> {
  try {
    const { query, timeframe, lat, lng, orgId, limit: maxResults = 20 } = options;
    const now = DateTime.now().setZone('America/Edmonton');
    const todayStr = now.toFormat('yyyy-MM-dd');
    const currentDay = now.toFormat('EEEE');

    const conditions: any[] = [
      sql`(${programs.verificationStatus} IS NULL OR ${programs.verificationStatus} NOT IN ('sunset', 'rejected', 'pending', 'changes_requested'))`,
    ];

    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          sql`${programs.title} ILIKE ${pattern}`,
          sql`${programs.description} ILIKE ${pattern}`
        )
      );
    }

    if (orgId) {
      conditions.push(eq(programs.orgId, orgId));
    }

    if (timeframe === 'today' || timeframe === 'next_7_days') {
      conditions.push(eq(programEvents.active, true));

      if (timeframe === 'today') {
        conditions.push(
          or(
            eq(programEvents.occursOnDate, todayStr),
            and(
              sql`${programEvents.occursOnDate} IS NULL`,
              eq(programEvents.dayOfWeek, currentDay as any),
              or(
                sql`${programEvents.effectiveFrom} IS NULL`,
                lte(programEvents.effectiveFrom, todayStr)
              ),
              or(
                sql`${programEvents.effectiveTo} IS NULL`,
                gte(programEvents.effectiveTo, todayStr)
              )
            )
          )
        );
      } else {
        const endDateStr = now.plus({ days: 7 }).toFormat('yyyy-MM-dd');
        const nextDays: string[] = [];
        for (let i = 0; i <= 7; i++) {
          nextDays.push(now.plus({ days: i }).toFormat('EEEE'));
        }
        const uniqueDays = [...new Set(nextDays)];

        conditions.push(
          or(
            and(
              sql`${programEvents.occursOnDate} IS NOT NULL`,
              gte(programEvents.occursOnDate, todayStr),
              lte(programEvents.occursOnDate, endDateStr)
            ),
            and(
              sql`${programEvents.occursOnDate} IS NULL`,
              inArray(programEvents.dayOfWeek, uniqueDays as any),
              or(
                sql`${programEvents.effectiveFrom} IS NULL`,
                lte(programEvents.effectiveFrom, endDateStr)
              ),
              or(
                sql`${programEvents.effectiveTo} IS NULL`,
                gte(programEvents.effectiveTo, todayStr)
              )
            )
          )
        );
      }

      const rows = await db
        .select({
          programId: programs.id,
          programName: programs.title,
          programDescription: programs.description,
          programTags: programs.tags,
          programDropIn: programs.dropIn,
          programLocation: programs.locationName,
          programAddress: programs.address,
          programLat: programs.lat,
          programLng: programs.lng,
          eventId: programEvents.id,
          eventName: programEvents.eventName,
          eventStart: programEvents.startTime,
          eventEnd: programEvents.endTime,
          eventLocation: programEvents.locationName,
          eventDropIn: programEvents.isDropIn,
          dayOfWeek: programEvents.dayOfWeek,
          occursOnDate: programEvents.occursOnDate,
        })
        .from(programs)
        .innerJoin(programEvents, eq(programEvents.programId, programs.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(maxResults);

      let results = rows.map((r) => ({
        programId: r.programId,
        programName: r.programName,
        description: r.programDescription,
        eventId: r.eventId,
        start: r.eventStart,
        end: r.eventEnd,
        venue: r.eventLocation || r.programLocation || r.programAddress,
        dayOfWeek: r.dayOfWeek,
        dropIn: r.eventDropIn ?? r.programDropIn ?? false,
        category: r.programTags?.[0] || null,
        _lat: r.programLat,
        _lng: r.programLng,
      }));

      if (lat !== undefined && lng !== undefined) {
        results = results.map(r => ({ ...r }));
        results.sort((a, b) => {
          const aLat = a._lat ? parseFloat(a._lat) : null;
          const aLng = a._lng ? parseFloat(a._lng) : null;
          const bLat = b._lat ? parseFloat(b._lat) : null;
          const bLng = b._lng ? parseFloat(b._lng) : null;
          const aDist = (aLat && aLng) ? calculateDistance(lat, lng, aLat, aLng) : Infinity;
          const bDist = (bLat && bLng) ? calculateDistance(lat, lng, bLat, bLng) : Infinity;
          return aDist - bDist;
        });
      }

      return results.map(({ _lat, _lng, ...rest }) => rest);
    }

    const rows = await db
      .select({
        programId: programs.id,
        programName: programs.title,
        programDescription: programs.description,
        programTags: programs.tags,
        programDropIn: programs.dropIn,
        programLocation: programs.locationName,
        programAddress: programs.address,
      })
      .from(programs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(maxResults);

    return rows.map((r) => ({
      programId: r.programId,
      programName: r.programName,
      description: r.programDescription,
      eventId: null,
      start: null,
      end: null,
      venue: r.programLocation || r.programAddress,
      dayOfWeek: null,
      dropIn: r.programDropIn ?? false,
      category: r.programTags?.[0] || null,
    }));
  } catch (error) {
    logger.error({ err: error, context: 'program-search-service' }, 'Error searching programs');
    return [];
  }
}

export async function getMySchedule(userId: string, from?: string, to?: string): Promise<ScheduleItem[]> {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const fromStr = from || now.toFormat('yyyy-MM-dd');
    const toStr = to || now.plus({ days: 7 }).toFormat('yyyy-MM-dd');

    const schedule: ScheduleItem[] = [];

    const rsvpRows = await db
      .select({
        programName: programs.title,
        eventName: programEvents.eventName,
        startTime: programEvents.startTime,
        endTime: programEvents.endTime,
        venue: programEvents.locationName,
        programAddress: programs.address,
        programLocation: programs.locationName,
        dayOfWeek: programEvents.dayOfWeek,
        occursOnDate: programEvents.occursOnDate,
        effectiveFrom: programEvents.effectiveFrom,
        effectiveTo: programEvents.effectiveTo,
      })
      .from(rsvps)
      .innerJoin(programs, eq(rsvps.programId, programs.id))
      .innerJoin(programEvents, eq(programEvents.programId, programs.id))
      .where(
        and(
          eq(rsvps.userId, userId),
          eq(programEvents.active, true),
          or(
            and(
              sql`${programEvents.occursOnDate} IS NOT NULL`,
              gte(programEvents.occursOnDate, fromStr),
              lte(programEvents.occursOnDate, toStr)
            ),
            and(
              sql`${programEvents.occursOnDate} IS NULL`,
              or(
                sql`${programEvents.effectiveFrom} IS NULL`,
                lte(programEvents.effectiveFrom, toStr)
              ),
              or(
                sql`${programEvents.effectiveTo} IS NULL`,
                gte(programEvents.effectiveTo, fromStr)
              )
            )
          )
        )
      );

    for (const row of rsvpRows) {
      schedule.push({
        type: 'program_event',
        programName: row.programName,
        title: row.eventName,
        start: row.occursOnDate
          ? `${row.occursOnDate}T${row.startTime}`
          : row.startTime,
        end: row.occursOnDate
          ? `${row.occursOnDate}T${row.endTime}`
          : row.endTime,
        venue: row.venue || row.programLocation || row.programAddress,
        day: row.dayOfWeek,
      });
    }

    // T043: tournament schedule rows removed — tournaments + tournament_*
    // tables dropped (out-of-pilot scope, /api/tournaments 410'd since T024).

    schedule.sort((a, b) => {
      const aTime = a.start || '';
      const bTime = b.start || '';
      return aTime.localeCompare(bTime);
    });

    return schedule;
  } catch (error) {
    logger.error({ err: error, context: 'program-search-schedule' }, 'Error fetching schedule');
    return [];
  }
}

export function formatProgramResultsForAI(results: ProgramSearchResult[], asOfDate: string): string {
  if (results.length === 0) {
    return `\nNo programs found matching the query. Suggest the user check the Explore page or try again later.\n`;
  }

  let text = `\n\nPROGRAM SEARCH RESULTS (as of ${asOfDate}):\n`;
  text += `IMPORTANT: Only mention programs from this list. Do not make up program names or details.\n`;
  results.forEach((p, i) => {
    text += `${i + 1}. "${p.programName}" - ${p.venue || 'TBD'}, ${p.dayOfWeek || ''} ${p.start && p.end ? `${p.start}-${p.end}` : 'See schedule'}${p.dropIn ? ' (drop-in)' : ''}\n`;
  });
  text += `If none match what they asked, say "I didn't find anything matching that right now" and suggest checking Explore.\n`;
  return text;
}

export function formatScheduleForAI(schedule: ScheduleItem[], asOfDate: string): string {
  if (schedule.length === 0) {
    return `\nYou're not registered for any programs yet. Suggest checking out the Explore page to find something.\n`;
  }

  let text = `\n\nYOUR SCHEDULE (as of ${asOfDate}):\n`;
  text += `IMPORTANT: Only mention items from this list.\n`;
  schedule.forEach((s, i) => {
    if (s.type === 'program_event') {
      text += `${i + 1}. "${s.programName}" at ${s.venue || 'TBD'}, ${s.day || ''} ${s.start || 'See schedule'}\n`;
    } else {
      text += `${i + 1}. Tournament: "${s.programName}" - Team: ${s.teamName || 'Free agent'}\n`;
    }
  });
  return text;
}

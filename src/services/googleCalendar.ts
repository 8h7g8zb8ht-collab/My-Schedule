import { CalendarEvent } from '../types';
import { OAUTH_CLIENT_ID } from '../lib/firebase';

declare global {
  interface Window {
    google?: any;
  }
}

const TOKEN_KEY = 'my_schedule_gcal_token';
const EXPIRY_KEY = 'my_schedule_gcal_token_expiry';
const USER_EMAIL_KEY = 'my_schedule_gcal_email';

export class GoogleCalendarService {
  private static tokenClient: any = null;

  static getStoredToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!token) return null;
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      this.clearToken();
      return null;
    }
    return token;
  }

  static getConnectedEmail(): string | null {
    return localStorage.getItem(USER_EMAIL_KEY);
  }

  static setToken(token: string, expiresInSeconds: number = 3600, email?: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, (Date.now() + (expiresInSeconds - 60) * 1000).toString());
    if (email) {
      localStorage.setItem(USER_EMAIL_KEY, email);
    }
  }

  static clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
  }

  static isConnected(): boolean {
    return !!this.getStoredToken();
  }

  /**
   * Request user authorization using Google Identity Services token client
   */
  static requestGoogleCalendarAccess(hintEmail?: string): Promise<{ token: string; email?: string }> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not defined'));
        return;
      }

      if (!window.google?.accounts?.oauth2) {
        // Retry shortly if script is still loading
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.google?.accounts?.oauth2) {
            clearInterval(interval);
            this.initAndRequestToken(hintEmail, resolve, reject);
          } else if (attempts > 20) {
            clearInterval(interval);
            reject(new Error('Google Identity Services script not ready. Please refresh or check connection.'));
          }
        }, 200);
        return;
      }

      this.initAndRequestToken(hintEmail, resolve, reject);
    });
  }

  private static initAndRequestToken(
    hintEmail: string | undefined,
    resolve: (val: { token: string; email?: string }) => void,
    reject: (err: any) => void
  ) {
    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        hint: hintEmail || undefined,
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3600;
            // Attempt to get user email if available
            let userEmail = hintEmail;
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                if (info.email) userEmail = info.email;
              }
            } catch {
              // ignore userinfo fallback
            }

            GoogleCalendarService.setToken(response.access_token, expiresIn, userEmail);
            resolve({ token: response.access_token, email: userEmail });
          } else {
            reject(new Error('No access token returned'));
          }
        },
      });

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  }

  /**
   * Fetch events from Google Calendar for a date range (defaults to -30 days to +90 days)
   */
  static async fetchEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const token = this.getStoredToken();
    if (!token) return [];

    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    if (!endDate) end.setDate(end.getDate() + 90);
    end.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (response.status === 401) {
        this.clearToken();
        throw new Error('Google Calendar authorization expired. Please reconnect.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to fetch events from Google Calendar');
      }

      const data = await response.json();
      const items = data.items || [];

      return items.map((item: any) => this.convertToLocalEvent(item));
    } catch (err: any) {
      console.warn('Error fetching Google Calendar events:', err);
      throw err;
    }
  }

  /**
   * Create an event on Google Calendar
   */
  static async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<{ googleEventId: string }> {
    const token = this.getStoredToken();
    if (!token) throw new Error('Google Calendar is not connected');

    const body = this.convertToGooglePayload(event);

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (response.status === 401) {
      this.clearToken();
      throw new Error('Google Calendar session expired. Please reconnect.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to create event in Google Calendar');
    }

    const data = await response.json();
    return { googleEventId: data.id };
  }

  /**
   * Update an event on Google Calendar
   */
  static async updateEvent(event: CalendarEvent): Promise<void> {
    if (!event.googleEventId) return;
    const token = this.getStoredToken();
    if (!token) throw new Error('Google Calendar is not connected');

    const body = this.convertToGooglePayload(event);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (response.status === 401) {
      this.clearToken();
      throw new Error('Google Calendar session expired. Please reconnect.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to update Google Calendar event');
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  static async deleteEvent(googleEventId: string): Promise<void> {
    const token = this.getStoredToken();
    if (!token) return;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      this.clearToken();
    }
  }

  private static convertToGooglePayload(event: Partial<CalendarEvent>) {
    const dateStr = event.date || new Date().toISOString().split('T')[0];
    const startTimeStr = event.startTime || '09:00';
    const endTimeStr = event.endTime || '10:00';

    const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`).toISOString();
    const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`).toISOString();

    const payload: any = {
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      start: {
        dateTime: startDateTime,
      },
      end: {
        dateTime: endDateTime,
      },
    };

    if (event.recurrence && event.recurrence !== 'none') {
      const freq = event.recurrence.toUpperCase();
      payload.recurrence = [`RRULE:FREQ=${freq}`];
    }

    if (event.reminder && event.reminder !== 'none') {
      let minutes = 15;
      if (event.reminder === '5m') minutes = 5;
      else if (event.reminder === '10m') minutes = 10;
      else if (event.reminder === '30m') minutes = 30;
      else if (event.reminder === '1h') minutes = 60;
      else if (event.reminder === '1d') minutes = 1440;

      payload.reminders = {
        useDefault: false,
        overrides: [{ method: 'popup', minutes }],
      };
    }

    return payload;
  }

  private static convertToLocalEvent(googleItem: any): CalendarEvent {
    const startObj = googleItem.start || {};
    const endObj = googleItem.end || {};

    let date = '';
    let startTime = '09:00';
    let endTime = '10:00';

    if (startObj.dateTime) {
      const d = new Date(startObj.dateTime);
      date = d.toISOString().split('T')[0];
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      startTime = `${hours}:${mins}`;
    } else if (startObj.date) {
      date = startObj.date;
      startTime = '00:00';
    }

    if (endObj.dateTime) {
      const d = new Date(endObj.dateTime);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      endTime = `${hours}:${mins}`;
    } else if (endObj.date) {
      endTime = '23:59';
    }

    let reminder: CalendarEvent['reminder'] = 'none';
    if (googleItem.reminders?.overrides?.[0]?.minutes) {
      const mins = googleItem.reminders.overrides[0].minutes;
      if (mins <= 5) reminder = '5m';
      else if (mins <= 10) reminder = '10m';
      else if (mins <= 15) reminder = '15m';
      else if (mins <= 30) reminder = '30m';
      else if (mins <= 60) reminder = '1h';
      else reminder = '1d';
    }

    return {
      id: `gcal-${googleItem.id}`,
      title: googleItem.summary || '(Untitled Event)',
      date,
      startTime,
      endTime,
      description: googleItem.description || '',
      location: googleItem.location || '',
      reminder,
      googleEventId: googleItem.id,
      isSyncedWithGoogle: true,
      color: '#10b981', // emerald accent
    };
  }
}

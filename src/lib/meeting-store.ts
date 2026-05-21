export interface Meeting {
  id: string;
  type: "recording" | "notes";
  title: string;
  content: string;          // transcript (recording) or pasted text (notes)
  summary: string;          // AI analysis result
  createdAt: string;
  projectId?: string;
  audioUrl?: string;        // blob URL — transient, may be stale
}

const STORAGE_KEY = "pm-meetings";

export function getAllMeetings(projectId?: string | null): Meeting[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Meeting[];
    if (projectId === null || projectId === undefined) return all;
    return all.filter((m) => m.projectId === projectId);
  } catch {
    return [];
  }
}

export function getMeeting(id: string): Meeting | null {
  return getAllMeetings().find((m) => m.id === id) || null;
}

export function createMeeting(
  type: Meeting["type"],
  title: string,
  content: string,
  summary: string,
  projectId?: string,
  audioUrl?: string,
): Meeting {
  const meetings = getAllMeetings();
  const meeting: Meeting = {
    id: `mtg-${Date.now()}`,
    type,
    title,
    content,
    summary,
    createdAt: new Date().toISOString(),
    projectId: projectId || undefined,
    audioUrl: audioUrl || undefined,
  };
  meetings.unshift(meeting);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
  return meeting;
}

export function updateMeeting(
  id: string,
  updates: Partial<Pick<Meeting, "title" | "content" | "summary" | "projectId">>,
): Meeting | null {
  const meetings = getAllMeetings();
  const idx = meetings.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  meetings[idx] = { ...meetings[idx], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
  return meetings[idx];
}

export function deleteMeeting(id: string): void {
  const meetings = getAllMeetings().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
}

export const SUPABASE_URL = "https://fnqkkffuyvdruwwaibij.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucWtrZmZ1eXZkcnV3d2FpYmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjM2ODYsImV4cCI6MjEwMjY5OTY4Nn0.A0HBYh5vQjrmvVm-DZ_yLjnyXkDcOtAZoQvbT9NBvGA";

const headers = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

export const supabase = {
  from: (table: string) => ({
    insert: async (data: any) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    select: async (query: string = "*") => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${query}`, {
        method: "GET",
        headers
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    eq: async (column: string, value: string, selectQuery: string = "*") => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${selectQuery}`, {
        method: "GET",
        headers
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  })
};

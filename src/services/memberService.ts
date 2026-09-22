import { supabase } from './supabaseClient';
import type { Member, MemberFilters, PaginatedResult } from '@/types';

function parseDateSearch(search: string): string[] {
  const clean = search.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return [`joined_date.eq.${clean}`];
  }

  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return [`joined_date.eq.${year}-${month}-${day}`];
  }

  if (/^\d{4}-\d{2}$/.test(clean)) {
    const [year, month] = clean.split('-');
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    return [`and(joined_date.gte.${year}-${month}-01,joined_date.lte.${year}-${month}-${lastDay})`];
  }

  const my = clean.match(/^(\d{1,2})[-/](\d{4})$/);
  if (my) {
    const month = my[1].padStart(2, '0');
    const year = my[2];
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    return [`and(joined_date.gte.${year}-${month}-01,joined_date.lte.${year}-${month}-${lastDay})`];
  }

  if (/^(19|20)\d{2}$/.test(clean)) {
    const year = clean;
    return [`and(joined_date.gte.${year}-01-01,joined_date.lte.${year}-12-31)`];
  }

  return [];
}

let checkedColumns = false;
let hasContactColumns = false;

async function checkContactColumns(): Promise<boolean> {
  if (checkedColumns) return hasContactColumns;
  try {
    const { error } = await supabase
      .from('members')
      .select('email,phone')
      .limit(1);
    if (!error) {
      hasContactColumns = true;
    }
  } catch {
    hasContactColumns = false;
  }
  checkedColumns = true;
  return hasContactColumns;
}

export const memberService = {
  async getMembers(
    filters: MemberFilters = {},
    page = 1,
    pageSize = 25
  ): Promise<PaginatedResult<Member>> {
    let query = supabase
      .from('members')
      .select(
        `
        *,
        electoral_division:electoral_divisions(id, division_name),
        category:categories(id, category_name)
        `,
        { count: 'exact' }
      );

    if (filters.search) {
      const escapedSearch = filters.search.replace(/"/g, '\\"');
      const searchTerms = [
        `member_no.ilike."%${escapedSearch}%"`,
        `name.ilike."%${escapedSearch}%"`,
        `nic.ilike."%${escapedSearch}%"`,
        `address.ilike."%${escapedSearch}%"`
      ];
      const supportsContact = await checkContactColumns();
      if (supportsContact) {
        searchTerms.push(
          `email.ilike."%${escapedSearch}%"`,
          `phone.ilike."%${escapedSearch}%"`
        );
      }
      const dateTerms = parseDateSearch(filters.search);
      searchTerms.push(...dateTerms);
      query = query.or(searchTerms.join(','));
    }
    if (filters.division_id) {
      query = query.eq('electoral_division_id', filters.division_id);
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.date_from) {
      query = query.gte('joined_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('joined_date', filters.date_to);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: (data || []) as Member[],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  },

  async getMemberById(id: string): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .select(
        `
        *,
        electoral_division:electoral_divisions(id, division_name),
        category:categories(id, category_name)
        `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Member;
  },

  async createMember(member: Omit<Member, 'id' | 'created_at' | 'electoral_division' | 'category'>): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single();

    if (error) throw error;
    return data as Member;
  },

  async updateMember(id: string, member: Partial<Omit<Member, 'id' | 'created_at'>>): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .update(member)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Member;
  },

  async deleteMember(id: string): Promise<void> {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
  },

  async getExistingMembersForCheck(): Promise<{
    existingMemberNos: Set<string>;
    existingNICs: Set<string>;
    existingNames: Set<string>;
  }> {
    const memberNos = new Set<string>();
    const nics = new Set<string>();
    const names = new Set<string>();

    const pageSize = 1000;
    let page = 0;

    while (true) {
      const { data, error } = await supabase
        .from('members')
        .select('member_no, nic, name')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const m of data as { member_no?: string; nic?: string; name?: string }[]) {
        if (m.member_no) memberNos.add(String(m.member_no).trim());
        if (m.nic) {
          const normNic = String(m.nic).trim().toUpperCase().replace(/[\s-]/g, '');
          if (normNic) nics.add(normNic);
        }
        if (m.name) {
          const normName = String(m.name)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/^(mr|mrs|ms|dr|prof|rev)\.?\s+/i, '')
            .replace(/\s+/g, '');
          if (normName) names.add(normName);
        }
      }

      if (data.length < pageSize) break;
      page++;
    }

    return {
      existingMemberNos: memberNos,
      existingNICs: nics,
      existingNames: names,
    };
  },

  async getAllMemberNos(): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('members')
      .select('member_no');

    if (error) throw error;
    return new Set((data || []).map((m: { member_no: string }) => m.member_no));
  },

  // High-Speed Multi-Row Batch Insert (Uploads 1,000s of rows in seconds)
  async batchInsert(
    members: Omit<Member, 'id' | 'created_at' | 'electoral_division' | 'category'>[],
    batchSize = 500,
    onProgress?: (imported: number, total: number) => void
  ): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;

    const formattedMembers = members.map((m, idx) => ({
      member_no: String(m.member_no ?? '').trim() || `AUTO-${Date.now()}-${idx}`,
      name: String(m.name ?? '').trim(),
      address: String(m.address ?? '').trim() || '',
      email: m.email ? String(m.email).trim() : '',
      phone: m.phone ? String(m.phone).trim() : '',
      nic: String(m.nic ?? '').trim() || '',
      joined_date: m.joined_date || new Date().toISOString().split('T')[0],
      share_amount: Number(m.share_amount) || 0,
      electoral_division_id: m.electoral_division_id,
      category_id: m.category_id,
    }));

    for (let i = 0; i < formattedMembers.length; i += batchSize) {
      const batch = formattedMembers.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('members')
        .upsert(batch, { onConflict: 'member_no', ignoreDuplicates: true })
        .select('id');

      if (!error) {
        imported += (data || batch).length;
      } else {
        // Fallback for single batch failure
        for (const single of batch) {
          const { error: e } = await supabase.from('members').insert(single);
          if (!e) imported++; else failed++;
        }
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, formattedMembers.length), formattedMembers.length);
      }
    }

    return { imported, failed };
  },

  async batchUpdateShareAmounts(
    updates: { member_no: string; share_amount: number }[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < updates.length; i += 200) {
      const batch = updates.slice(i, i + 200);
      await Promise.all(
        batch.map(({ member_no, share_amount }) =>
          supabase.from('members').update({ share_amount }).eq('member_no', member_no)
        )
      );
      updated += batch.length;
      if (onProgress) onProgress(Math.min(i + 200, updates.length), updates.length);
    }
    return { updated, failed };
  },

  async batchUpsert(
    members: Omit<Member, 'id' | 'created_at' | 'electoral_division' | 'category'>[],
    batchSize = 500,
    onProgress?: (done: number, total: number) => void
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize).map((m) => ({
        ...m,
        member_no: String(m.member_no ?? '').trim(),
        email: m.email ? String(m.email).trim() : '',
        phone: m.phone ? String(m.phone).trim() : '',
        share_amount: Number(m.share_amount) || 0,
      }));

      const { data, error } = await supabase
        .from('members')
        .upsert(batch, { onConflict: 'member_no' })
        .select('id');

      if (!error) updated += (data || batch).length;
      else {
        for (const m of batch) {
          const { error: e } = await supabase
            .from('members')
            .upsert(m, { onConflict: 'member_no' });
          if (!e) updated++; else failed++;
        }
      }
      if (onProgress) onProgress(Math.min(i + batchSize, members.length), members.length);
    }
    return { updated, failed };
  },

  async getDashboardStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    async function getTotalCapital(): Promise<number> {
      let total = 0;
      const pageSize = 1000;
      let page = 0;
      while (true) {
        const { data } = await supabase
          .from('members')
          .select('share_amount')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (!data || data.length === 0) break;
        total += (data as { share_amount: number }[]).reduce(
          (s, m) => s + (m.share_amount || 0), 0
        );
        if (data.length < pageSize) break;
        page++;
      }
      return total;
    }

    const [totalRes, totalShareCapital, newRes, divRes] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      getTotalCapital(),
      supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('joined_date', firstDayOfMonth),
      supabase.from('electoral_divisions').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalMembers: totalRes.count || 0,
      totalShareCapital,
      newMembersThisMonth: newRes.count || 0,
      totalDivisions: divRes.count || 0,
    };
  },

  async getMonthlyRegistrations(months = 12): Promise<{ month: string; count: number }[]> {
    const result: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = d.toISOString().split('T')[0];
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('joined_date', from)
        .lte('joined_date', to);

      result.push({
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        count: count || 0,
      });
    }

    return result;
  },

  async getRecentMembers(limit = 10): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select(
        `
        *,
        electoral_division:electoral_divisions(id, division_name),
        category:categories(id, category_name)
        `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as Member[];
  },

  async getAllForReport(filters: MemberFilters = {}): Promise<Member[]> {
    const allMembers: Member[] = [];
    const pageSize = 1000;
    let page = 0;

    while (true) {
      let query = supabase
        .from('members')
        .select(
          `*, electoral_division:electoral_divisions(id, division_name), category:categories(id, category_name)`
        )
        .order('member_no')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.search) {
        const escapedSearch = filters.search.replace(/"/g, '\\"');
        const searchTerms = [
          `member_no.ilike."%${escapedSearch}%"`,
          `name.ilike."%${escapedSearch}%"`,
          `nic.ilike."%${escapedSearch}%"`,
          `address.ilike."%${escapedSearch}%"`
        ];
        const supportsContact = await checkContactColumns();
        if (supportsContact) {
          searchTerms.push(
            `email.ilike."%${escapedSearch}%"`,
            `phone.ilike."%${escapedSearch}%"`
          );
        }
        const dateTerms = parseDateSearch(filters.search);
        searchTerms.push(...dateTerms);
        query = query.or(searchTerms.join(','));
      }
      if (filters.division_id) query = query.eq('electoral_division_id', filters.division_id);
      if (filters.category_id) query = query.eq('category_id', filters.category_id);
      if (filters.date_from) query = query.gte('joined_date', filters.date_from);
      if (filters.date_to) query = query.lte('joined_date', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;
      allMembers.push(...(data as Member[]));
      if (data.length < pageSize) break;
      page++;
    }

    return allMembers;
  },
};

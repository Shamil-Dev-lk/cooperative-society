import { supabase } from './supabaseClient';
import type { Member, MemberFilters, PaginatedResult } from '@/types';

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
      query = query.or(
        `member_no.ilike.%${filters.search}%,name.ilike.%${filters.search}%,nic.ilike.%${filters.search}%`
      );
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

  async getAllMemberNos(): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('members')
      .select('member_no');

    if (error) throw error;
    return new Set((data || []).map((m: { member_no: string }) => m.member_no));
  },

  async batchInsert(
    members: Omit<Member, 'id' | 'created_at' | 'electoral_division' | 'category'>[],
    batchSize = 500,
    onProgress?: (imported: number, total: number) => void
  ): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const { error } = await supabase.from('members').insert(batch);

      if (error) {
        failed += batch.length;
      } else {
        imported += batch.length;
      }

      if (onProgress) {
        onProgress(imported + failed, members.length);
      }
    }

    return { imported, failed };
  },

  async getDashboardStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const [totalRes, shareRes, newRes, divRes] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      supabase.from('members').select('share_amount'),
      supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('joined_date', firstDayOfMonth),
      supabase.from('electoral_divisions').select('*', { count: 'exact', head: true }),
    ]);

    const totalShareCapital = (shareRes.data || []).reduce(
      (sum: number, m: { share_amount: number }) => sum + (m.share_amount || 0),
      0
    );

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
    let query = supabase
      .from('members')
      .select(
        `
        *,
        electoral_division:electoral_divisions(id, division_name),
        category:categories(id, category_name)
        `
      );

    if (filters.search) {
      query = query.or(
        `member_no.ilike.%${filters.search}%,name.ilike.%${filters.search}%,nic.ilike.%${filters.search}%`
      );
    }
    if (filters.division_id) query = query.eq('electoral_division_id', filters.division_id);
    if (filters.category_id) query = query.eq('category_id', filters.category_id);
    if (filters.date_from) query = query.gte('joined_date', filters.date_from);
    if (filters.date_to) query = query.lte('joined_date', filters.date_to);

    const { data, error } = await query.order('member_no');
    if (error) throw error;
    return (data || []) as Member[];
  },
};

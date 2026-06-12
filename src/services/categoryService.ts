import { supabase } from './supabaseClient';
import type { Category } from '@/types';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        member_count:members(count)
      `)
      .order('category_name');

    if (error) throw error;

    return (data || []).map((c: Category & { member_count: { count: number }[] }) => ({
      ...c,
      member_count: c.member_count?.[0]?.count ?? 0,
    }));
  },

  async getById(id: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Category;
  },

  async create(category_name: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ category_name })
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async update(id: string, category_name: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update({ category_name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  async search(query: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .ilike('category_name', `%${query}%`)
      .order('category_name');

    if (error) throw error;
    return (data || []) as Category[];
  },
};

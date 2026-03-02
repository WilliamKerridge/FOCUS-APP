import { supabase } from '@/lib/supabase'

export async function checkHandoffExists(userId: string, type: string, date: string): Promise<boolean> {
  const { data } = await supabase
    .from('handoffs')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('date', date)
    .maybeSingle()
  return !!data
}

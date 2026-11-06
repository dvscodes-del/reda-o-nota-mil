import { supabase } from '@/integrations/supabase/client';

export const getChatLastReadTime = (userId: string, contactId: string): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(`chat_last_read_${userId}_${contactId}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

export const setChatLastReadTime = (userId: string, contactId: string, timestamp?: number): void => {
  if (typeof window === 'undefined') return;
  try {
    const time = timestamp || Date.now();
    localStorage.setItem(`chat_last_read_${userId}_${contactId}`, time.toString());
  } catch {}
};

/**
 * Marca as mensagens recebidas de um contato como lidas tanto no Supabase quanto no localStorage.
 */
export const markChatMessagesAsRead = async (userId: string, contactId: string): Promise<void> => {
  // 1. Atualiza timestamp local de leitura
  setChatLastReadTime(userId, contactId, Date.now());

  // 2. Tenta atualizar no Supabase
  try {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', contactId)
      .eq('is_read', false);
  } catch (err) {
    console.warn('Erro ao atualizar status de leitura de mensagens no Supabase:', err);
  }
};

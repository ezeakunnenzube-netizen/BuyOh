-- ============================================================
-- BuyOh Messaging: Production-Ready Migration
-- Run this in Supabase Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================

-- 1. Add missing columns to conversations & messages
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image TEXT;

-- 2. Backfill updated_at for existing conversations from their latest message
UPDATE public.conversations c
SET updated_at = COALESCE(
  (SELECT MAX(m.created_at) FROM public.messages m WHERE m.conversation_id = c.id),
  c.created_at
)
WHERE c.updated_at IS NULL OR c.updated_at = c.created_at;

-- 3. Auto-update conversations.updated_at whenever a message is inserted
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_ts ON public.messages;
CREATE TRIGGER trg_update_conversation_ts
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- 4. Tighten RLS policies on conversations
-- Remove old wide-open policy
DROP POLICY IF EXISTS "Enable all on conversations" ON public.conversations;

-- SELECT: users can only see conversations where they are buyer or seller
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- INSERT: authenticated users can create conversations where they are buyer or seller
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- UPDATE: users can update conversations they participate in
CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- DELETE: users can delete conversations they participate in
CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE
USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- 5. Tighten RLS policies on messages
-- Remove old wide-open policy
DROP POLICY IF EXISTS "Enable all on messages" ON public.messages;

-- SELECT: users can only see messages in conversations they participate in
CREATE POLICY "Users can view messages in own conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- INSERT: users can only insert messages with their own sender_id, in their conversations
CREATE POLICY "Users can send messages in own conversations"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- UPDATE: users can update message status in their conversations (for read receipts)
CREATE POLICY "Users can update message status"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- DELETE: users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
USING (
  sender_id = auth.uid()
);

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 7. Create chat-attachments Storage bucket for voice notes & images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];

-- Storage policies for chat-attachments
DROP POLICY IF EXISTS "Chat attachments are publicly readable" ON storage.objects;
CREATE POLICY "Chat attachments are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own chat attachments" ON storage.objects;
CREATE POLICY "Users can update own chat attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

-- 8. RPC to increment unread_count on conversation (SECURITY DEFINER so sender can update recipient's view)
CREATE OR REPLACE FUNCTION public.increment_unread_count(conv_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.conversations
  SET unread_count = COALESCE(unread_count, 0) + 1,
      updated_at = now()
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_unread_count(UUID) TO authenticated;

-- Done! Verify by checking:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'messages';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'conversations';

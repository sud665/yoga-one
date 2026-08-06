import { ChatRoomScreen } from '@/components/chat/ChatRoomScreen'

export default async function AdminChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ChatRoomScreen role="owner" conversationId={id} />
}

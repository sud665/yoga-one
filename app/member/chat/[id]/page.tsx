import { ChatRoomScreen } from '@/components/chat/ChatRoomScreen'

export default async function MemberChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ChatRoomScreen role="member" conversationId={id} />
}

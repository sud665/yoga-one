import { ChatRoomScreen } from '@/components/chat/ChatRoomScreen'

export default async function InstructorChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ChatRoomScreen role="instructor" conversationId={id} />
}

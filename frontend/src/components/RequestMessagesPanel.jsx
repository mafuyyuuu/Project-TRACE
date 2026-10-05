import SupportWorkspace from '@/components/SupportWorkspace';
/** Legacy page entry: request and general history now share one ticket workspace. */
export default function RequestMessagesPanel({user,initialDocumentId,compact = false}) {
  return <SupportWorkspace key={user.id} user={user} initialDocumentId={initialDocumentId} compact={compact} />;
}

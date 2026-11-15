export const normalizeItems = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item, index) => ({
    id: item.id ?? `idx-${index}`,
    category: item.category ?? '',
    targetAge: item.target_age ?? null,
    title: item.title ?? '',
    note: item.note ?? '',
    imageUrl: item.image_url ?? '',
    nextAction: item.next_action ?? '',
    progress: item.progress ?? '',
    status: item.status ?? '',
    completed: item.completed ?? false,
    completedAt: item.completed_at ?? null
  }));
};

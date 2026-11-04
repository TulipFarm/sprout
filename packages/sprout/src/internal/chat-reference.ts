/** The character typed before each kind of chat reference, shown in front of its label. */
export const chatReferenceChars = { agent: '@', skill: '/', file: '#' } as const;

export type ChatReferenceKind = keyof typeof chatReferenceChars;

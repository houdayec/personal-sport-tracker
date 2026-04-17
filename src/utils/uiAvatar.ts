const DEFAULT_AVATAR_NAME = 'User'

export const buildUiAvatarUrl = (name?: string): string => {
    const normalizedName = name?.trim() || DEFAULT_AVATAR_NAME

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        normalizedName,
    )}&background=0f766e&color=ffffff&bold=true&format=svg`
}

// components/IconPickerDialog.tsx
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { ICON_PALETTE } from '@/utils/thumbnailUtils'
import { useState, type FC } from 'react'

type Props = {
    open: boolean
    onClose: () => void
    onSelect: (iconName: string) => void
}

const IconPickerDialog: FC<Props> = ({ open, onClose, onSelect }) => {
    /* — filter state — */
    const [query, setQuery] = useState('')

    const filtered = ICON_PALETTE.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()),
    )

    /* — render — */
    return (
        <Dialog width={700} isOpen={open} onClose={onClose}>
            <h5 className="mb-4 font-semibold">Pick an icon</h5>

            {/* search */}
            <Input
                placeholder="Search…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="mb-4"
            />

            {/* icon grid */}
            <div className="grid grid-cols-6 gap-3 max-h-[400px] overflow-y-auto">
                {filtered.map(({ name, Comp }) => (
                    <button
                        key={name}
                        className="border rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                            console.log('[IconPicker] selected', name)
                            onSelect(name)
                            onClose()
                        }}
                    >
                        <Comp size={32} />
                        <span className="text-xs block mt-1">{name}</span>
                    </button>
                ))}
            </div>
        </Dialog>
    )
}

export default IconPickerDialog

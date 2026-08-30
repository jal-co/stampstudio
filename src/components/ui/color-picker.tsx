'use client'

import { Pipette } from 'lucide-react'
import { parseColor } from '@react-stately/color'
import { use } from 'react'
import {
  ColorPicker as ColorPickerPrimitive,
  type ColorPickerProps as ColorPickerPrimitiveProps,
  ColorPickerStateContext,
} from 'react-aria-components/ColorPicker'
import { twMerge } from 'tailwind-merge'
import { Button } from './button'
import { fieldStyles } from './field'

interface ColorPickerProps extends ColorPickerPrimitiveProps {
  className?: string
}

const ColorPicker = ({ className, ...props }: ColorPickerProps) => {
  return (
    <div data-slot="control" className={twMerge(fieldStyles({ className: 'w-fit' }), className)}>
      <ColorPickerPrimitive {...props} />
    </div>
  )
}

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

const EyeDropper = () => {
  const state = use(ColorPickerStateContext)!

  if (!window.EyeDropper) {
    return 'EyeDropper is not supported in your browser.'
  }

  return (
    <Button
      className="shrink-0"
      aria-label="Eye dropper"
      size="icon"
      variant="outline"
      onClick={() => {
        const eyeDropper = window.EyeDropper ? new window.EyeDropper() : null
        eyeDropper?.open().then((result) => state.setColor(parseColor(result.sRGBHex)))
      }}
    >
      <Pipette aria-hidden />
    </Button>
  )
}

export type { ColorPickerProps }
export { ColorPicker, EyeDropper }

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const AvailableChartColors = [
  "primary",
  "secondary", 
  "orange",
  "blue",
  "green",
  "purple",
  "pink",
  "red",
  "yellow",
  "teal",
  "indigo",
  "emerald",
  "amber",
  "lime",
  "cyan",
  "sky",
  "violet",
  "fuchsia",
  "rose",
  "slate",
  "gray",
  "zinc",
] as const

export type AvailableChartColorsKeys = (typeof AvailableChartColors)[number]

export const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>()
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index] ?? colors[0])
  })
  return categoryColors
}

export const getColorClassName = (
  color: AvailableChartColorsKeys,
  type: "bg" | "text" | "stroke" | "fill",
): string => {
  const colorClasses = {
    bg: {
      primary: "bg-primary",
      secondary: "bg-secondary",
      orange: "bg-orange-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      purple: "bg-purple-500",
      pink: "bg-pink-500",
      red: "bg-red-500",
      yellow: "bg-yellow-500",
      teal: "bg-teal-500",
      indigo: "bg-indigo-500",
      emerald: "bg-emerald-500",
      amber: "bg-amber-500",
      lime: "bg-lime-500",
      cyan: "bg-cyan-500",
      sky: "bg-sky-500",
      violet: "bg-violet-500",
      fuchsia: "bg-fuchsia-500",
      rose: "bg-rose-500",
      slate: "bg-slate-500",
      gray: "bg-gray-500",
      zinc: "bg-zinc-500",
    },
    text: {
      primary: "text-primary",
      secondary: "text-secondary",
      orange: "text-orange-500",
      blue: "text-blue-500",
      green: "text-green-500",
      purple: "text-purple-500",
      pink: "text-pink-500",
      red: "text-red-500",
      yellow: "text-yellow-500",
      teal: "text-teal-500",
      indigo: "text-indigo-500",
      emerald: "text-emerald-500",
      amber: "text-amber-500",
      lime: "text-lime-500",
      cyan: "text-cyan-500",
      sky: "text-sky-500",
      violet: "text-violet-500",
      fuchsia: "text-fuchsia-500",
      rose: "text-rose-500",
      slate: "text-slate-500",
      gray: "text-gray-500",
      zinc: "text-zinc-500",
    },
    stroke: {
      primary: "stroke-primary",
      secondary: "stroke-secondary",
      orange: "stroke-orange-500",
      blue: "stroke-blue-500",
      green: "stroke-green-500",
      purple: "stroke-purple-500",
      pink: "stroke-pink-500",
      red: "stroke-red-500",
      yellow: "stroke-yellow-500",
      teal: "stroke-teal-500",
      indigo: "stroke-indigo-500",
      emerald: "stroke-emerald-500",
      amber: "stroke-amber-500",
      lime: "stroke-lime-500",
      cyan: "stroke-cyan-500",
      sky: "stroke-sky-500",
      violet: "stroke-violet-500",
      fuchsia: "stroke-fuchsia-500",
      rose: "stroke-rose-500",
      slate: "stroke-slate-500",
      gray: "stroke-gray-500",
      zinc: "stroke-zinc-500",
    },
    fill: {
      primary: "fill-primary",
      secondary: "fill-secondary",
      orange: "fill-orange-500",
      blue: "fill-blue-500",
      green: "fill-green-500",
      purple: "fill-purple-500",
      pink: "fill-pink-500",
      red: "fill-red-500",
      yellow: "fill-yellow-500",
      teal: "fill-teal-500",
      indigo: "fill-indigo-500",
      emerald: "fill-emerald-500",
      amber: "fill-amber-500",
      lime: "fill-lime-500",
      cyan: "fill-cyan-500",
      sky: "fill-sky-500",
      violet: "fill-violet-500",
      fuchsia: "fill-fuchsia-500",
      rose: "fill-rose-500",
      slate: "fill-slate-500",
      gray: "fill-gray-500",
      zinc: "fill-zinc-500",
    },
  }
  return colorClasses[type][color]
}

export const getYAxisDomain = (
  autoMinValue: boolean,
  minValue?: number,
  maxValue?: number,
): [number | string, number | string] => {
  if (autoMinValue) {
    return ["dataMin", "dataMax"]
  }
  return [minValue ?? "dataMin", maxValue ?? "dataMax"]
}

export const hasOnlyOneValueForKey = (
  data: Record<string, unknown>[],
  key: string,
): boolean => {
  const values = data.map((item) => item[key]).filter((value) => value !== null && value !== undefined)
  return new Set(values).size === 1
}

export const cx = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
} 
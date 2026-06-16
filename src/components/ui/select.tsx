"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { getReactNodeText, matchesSearchQuery } from "@/lib/react-node-text"
import { SEARCH_DEBOUNCE_MS, useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon, Search } from "lucide-react"

type SelectSearchFilterContextValue = {
  debouncedQuery: string
  searchable: boolean
  listId: string
}

const SelectSearchFilterContext =
  React.createContext<SelectSearchFilterContextValue | null>(null)

const SelectSearchResetRefContext = React.createContext<
  React.MutableRefObject<(() => void) | null> | null
>(null)

const SelectSearchInputResetRefContext = React.createContext<
  React.MutableRefObject<(() => void) | null> | null
>(null)

function useSelectSearchFilterContext() {
  return React.useContext(SelectSearchFilterContext)
}

function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectPrimitive.Root.Props<Value, Multiple>,
) {
  const searchResetRef = React.useRef<(() => void) | null>(null)
  const { onOpenChange, ...rest } = props

  return (
    <SelectSearchResetRefContext.Provider value={searchResetRef}>
      <SelectPrimitive.Root<Value, Multiple>
        {...rest}
        onOpenChange={(open, eventDetails) => {
          if (!open) searchResetRef.current?.()
          onOpenChange?.(open, eventDetails)
        }}
      />
    </SelectSearchResetRefContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectSearchInput({
  placeholder,
  listId,
  onDebouncedQueryChange,
}: {
  placeholder: string
  listId: string
  onDebouncedQueryChange: (query: string) => void
}) {
  const inputResetRef = React.useContext(SelectSearchInputResetRefContext)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  const onDebouncedQueryChangeRef = React.useRef(onDebouncedQueryChange)
  onDebouncedQueryChangeRef.current = onDebouncedQueryChange

  React.useEffect(() => {
    onDebouncedQueryChangeRef.current(debouncedQuery)
  }, [debouncedQuery])

  React.useEffect(() => {
    if (!inputResetRef) return
    inputResetRef.current = () => setQuery("")
    return () => {
      inputResetRef.current = null
    }
  }, [inputResetRef])

  const clearSearch = React.useCallback(() => {
    setQuery("")
    onDebouncedQueryChangeRef.current("")
  }, [])

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    },
    [],
  )

  const focusFirstVisibleItem = React.useCallback(() => {
    const list = document.getElementById(listId)
    const firstItem = list?.querySelector<HTMLElement>(
      '[data-slot="select-item"]:not([data-search-hidden])',
    )
    firstItem?.focus()
  }, [listId])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation()
      if (e.key === "Escape") {
        clearSearch()
        return
      }
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault()
        focusFirstVisibleItem()
      }
    },
    [clearSearch, focusFirstVisibleItem],
  )

  return (
    <div
      className="shrink-0 border-b border-border bg-popover p-1.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="h-8 pl-8 text-sm"
          autoComplete="off"
          autoFocus
          aria-controls={listId}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}

function SelectSearchEmptyState() {
  const ctx = useSelectSearchFilterContext()
  const [showEmpty, setShowEmpty] = React.useState(false)

  React.useLayoutEffect(() => {
    const q = ctx?.debouncedQuery.trim() ?? ""
    if (!ctx?.searchable || !q) {
      setShowEmpty(false)
      return
    }
    const list = document.getElementById(ctx.listId)
    const visibleCount =
      list?.querySelectorAll('[data-slot="select-item"]:not([data-search-hidden])')
        .length ?? 0
    setShowEmpty(visibleCount === 0)
  }, [ctx?.debouncedQuery, ctx?.listId, ctx?.searchable])

  if (!showEmpty) return null

  return (
    <p className="px-2.5 py-2 text-center text-xs text-muted-foreground">
      Tidak ada hasil untuk &ldquo;{ctx?.debouncedQuery.trim()}&rdquo;
    </p>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  searchable = true,
  searchPlaceholder = "Cari…",
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  > & {
    /** Aktifkan kotak pencarian di dalam dropdown. Default: true */
    searchable?: boolean
    searchPlaceholder?: string
  }) {
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const listId = React.useId()
  const searchResetRef = React.useContext(SelectSearchResetRefContext)
  const searchInputResetRef = React.useRef<(() => void) | null>(null)

  const handleDebouncedQueryChange = React.useCallback((query: string) => {
    setDebouncedQuery(query)
  }, [])

  React.useEffect(() => {
    if (!searchResetRef) return
    searchResetRef.current = () => {
      setDebouncedQuery("")
      searchInputResetRef.current?.()
    }
    return () => {
      searchResetRef.current = null
    }
  }, [searchResetRef])

  const filterContext = React.useMemo<SelectSearchFilterContextValue>(
    () => ({
      debouncedQuery,
      searchable,
      listId,
    }),
    [debouncedQuery, searchable, listId],
  )

  // alignItemWithTrigger + filter yang unmount item merusak posisi popup Base UI.
  const resolvedAlignItemWithTrigger = searchable ? false : alignItemWithTrigger

  return (
    <SelectSearchFilterContext.Provider value={filterContext}>
      <SelectSearchInputResetRefContext.Provider value={searchInputResetRef}>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            alignItemWithTrigger={resolvedAlignItemWithTrigger}
            className="isolate z-50"
          >
            <SelectPrimitive.Popup
              data-slot="select-content"
              data-align-trigger={resolvedAlignItemWithTrigger}
              className={cn(
                "relative isolate z-50 flex max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                className,
              )}
              {...props}
            >
              {searchable ? (
                <SelectSearchInput
                  placeholder={searchPlaceholder}
                  listId={listId}
                  onDebouncedQueryChange={handleDebouncedQueryChange}
                />
              ) : null}
              <SelectScrollUpButton />
              <SelectPrimitive.List
                id={listId}
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1"
              >
                {children}
              </SelectPrimitive.List>
              <SelectSearchEmptyState />
              <SelectScrollDownButton />
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectSearchInputResetRefContext.Provider>
    </SelectSearchFilterContext.Provider>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

const SelectItem = React.memo(function SelectItem({
  className,
  children,
  searchLabel,
  value,
  ...props
}: SelectPrimitive.Item.Props & {
  /** Teks untuk filter pencarian; default dari label item */
  searchLabel?: string
}) {
  const searchCtx = useSelectSearchFilterContext()
  const label = React.useMemo(
    () => searchLabel ?? getReactNodeText(children),
    [searchLabel, children],
  )

  const isVisible =
    !searchCtx?.searchable ||
    value == null ||
    matchesSearchQuery(label, searchCtx.debouncedQuery)

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-search-hidden={isVisible ? undefined : ""}
      value={value}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        !isVisible && "hidden",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
})

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

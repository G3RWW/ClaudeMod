import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRun, Flow } from '../types'
import {
  agentSvg, colorOf, compactSvg, ctxBar, ctxOf, detectLang, elapsed, fmtCost, fmtTime,
  fmtTokens, gridSvg, gridTiles, headerHeight, headerSvg, isRtl, LINE_H, plannedOf, plannedSvg,
  progressOf, runModel, setLang, STATUS_GLYPH, tierModel, tierOf, tierWord, TIER_COLOR, totals, tr,
} from './savvy'

// savvy-progress owns and writes these; this mod only reads them.
const flow = atom({ plugin: 'savvy-progress', key: 'flow' } as const, null as Flow | null)
const agents = atom({ plugin: 'savvy-progress', key: 'agents' } as const, [] as AgentRun[])
const now = atom({ plugin: 'savvy-progress', key: 'now' } as const, 0)

// The file tree's pane (filetree) and the agents pane (savvy-progress).
const TREE = 'filetree'
const AGENTS = 'savvy-agents'

const section = atom({ plugin: 'agent-tree', key: 'section' } as const, { isCompact: false, isDoneCollapsed: true })

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    setLang(await detectLang($, options.language))
    return started
  })

  // savvy-progress opens its own pane (auto-open, /agents-info): open the file tree
  // instead, where the agents now live, and leave the separate pane unplaced.
  on('ui.open', { id: AGENTS }, async $ => {
    await $.ui.open({ id: TREE, title: 'Files' }).catch(() => undefined)
    return { value: { isPlaced: false as const, reason: 'shown at the top of the file tree (agent-tree)' } }
  })

  on('ui.render', { component: 'Pane', requestId: TREE }, async ($, e, next) => {
    const tree = await next(e)
    if (e.surface !== 'desktop' && e.surface !== 'terminal') return tree
    if (e.props.placement === 'inline') return tree

    const list: AgentRun[] = await read($, agents)
    const f: Flow | null = await read($, flow)
    const planned = plannedOf(f, list)
    // No subagents and no plan this session: the tree keeps the whole pane.
    if (list.length === 0 && planned.length === 0) return tree

    const s = tr()
    const p = await read($, section)
    const at = Math.max(await read($, now), ...list.map(a => a.startedAt), 0)
    const running = list.filter(a => a.status === 'running').reverse()
    const finished = list.filter(a => a.status !== 'running').reverse()
    const t = totals(list, at)
    const title = f && !f.isFinished ? f.title : ''
    const summary = `≈${fmtCost(t.cost)}, ${fmtTokens(t.tokens)} ${s.tokensWord}, ${fmtTime(t.time)}`

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const toggleCompact = (
      <Button
        key="at-compact"
        label={p.isCompact ? s.expand : s.collapse}
        plain
        onPress={() => update($, section, prev => ({ ...prev, isCompact: !prev.isCompact }))}
      />
    )
    const toggleDone = (
      <Button
        key="at-done"
        label={`${p.isDoneCollapsed ? (isRtl() ? '◂' : '▸') : '▾'} ${s.finished} · ${finished.length}`}
        plain
        onPress={() => update($, section, prev => ({ ...prev, isDoneCollapsed: !prev.isDoneCollapsed }))}
      />
    )
    const align = isRtl() ? 'flex-end' : undefined

    let agentsPart
    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      if (p.isCompact) {
        agentsPart = (
          <Box key="at-agents" flexDirection="column" gap={1} alignItems={align}>
            <Svg source={compactSvg(W, list, planned, t)} alt={`${list.length} ${s.agentsCount}, ${summary}`} width={W} height={32} />
            {toggleCompact}
          </Box>
        )
      } else {
        const shownDone = p.isDoneCollapsed ? 0 : finished.length
        const lines = 1 + (running.length > 0 ? 1 : 0) + (finished.length > 0 ? 1 : 0) + (planned.length > 0 ? 1 : 0)
        const gridH = headerHeight(title) + lines * LINE_H + (running.length + shownDone) * 66 + planned.length * 46
        agentsPart = (
          <Box key="at-agents" flexDirection="column">
            {gridTiles(gridH).map((tileH, i) => (
              <Svg key={`at-grid-${i}`} source={gridSvg(W, tileH)} alt="dotted grid" width={W} height={tileH} />
            ))}
            <Box flexDirection="column" position="absolute" top={0} left={0} right={0} alignItems={align}>
              <Svg source={headerSvg(W, title, t)} alt={title ? `${title}: ${summary}` : summary} width={W} height={headerHeight(title)} />
              {toggleCompact}
              {running.length > 0 && <Text dimColor>{`${s.running} · ${running.length}`}</Text>}
              {running.map(a => (
                <Svg key={`at-${a.id}`} source={agentSvg(W, a, at)} alt={`${a.description}: ${s.isRunning}`} width={W} height={66} />
              ))}
              {finished.length > 0 && toggleDone}
              {!p.isDoneCollapsed &&
                finished.map(a => (
                  <Svg key={`at-${a.id}`} source={agentSvg(W, a, at)} alt={`${a.description}: ${s.isFinished}`} width={W} height={66} />
                ))}
              {planned.length > 0 && <Text dimColor>{`${s.planned} · ${planned.length}`}</Text>}
              {planned.map(pl => (
                <Svg key={`at-plan-${pl.n}`} source={plannedSvg(W, pl)} alt={`${pl.n}. ${pl.title}: ${s.isPlanned}`} width={W} height={46} />
              ))}
            </Box>
          </Box>
        )
      }
    } else {
      // Terminal: one text row per agent, so the tree keeps most of the rows.
      const cols = Math.max(24, e.props.bodyColumns || 40)
      const barW = Math.max(6, Math.min(16, cols - 34))
      const row = (a: AgentRun) => {
        const tier = tierOf(a.type)
        const color = colorOf(tier)
        const progress = progressOf(a)
        return (
          <Text key={`at-${a.id}`} wrap="truncate-end">
            <Text color={a.status === 'failed' ? 'red' : a.status === 'done' ? 'green' : color}>{STATUS_GLYPH[a.status]} </Text>
            <Text bold>{a.description || a.type}</Text>
            <Text dimColor> {tier === 'other' ? a.type : tierWord(tier)} · {runModel(a)} </Text>
            {progress === null ? <Text dimColor>{ctxBar(ctxOf(a), barW)}</Text> : <Text color={color}>{ctxBar(progress * 100, barW)}</Text>}
            <Text dimColor> ≈{fmtCost(a.costUsd)} {fmtTime(elapsed(a, at))}</Text>
          </Text>
        )
      }
      agentsPart = (
        <Box key="at-agents" flexDirection="column">
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold wrap="truncate-end">{title || s.pane}</Text>
            {toggleCompact}
          </Box>
          <Text dimColor>≈{fmtCost(t.cost)} · {fmtTokens(t.tokens)} {s.tokensWord} · {fmtTime(t.time)}</Text>
          {!p.isCompact && running.map(row)}
          {!p.isCompact && finished.length > 0 && toggleDone}
          {!p.isCompact && !p.isDoneCollapsed && finished.map(row)}
          {!p.isCompact &&
            planned.map(pl => {
              const tier = pl.tier in TIER_COLOR ? pl.tier : 'other'
              return (
                <Text key={`at-plan-${pl.n}`} dimColor wrap="truncate-end">
                  <Text color={colorOf(tier)}>▢</Text> {pl.n}. {pl.title} · {tierWord(tier)} · {tierModel(tier)}
                </Text>
              )
            })}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {agentsPart}
        <Text key="at-rule" dimColor>{'─'.repeat(Math.max(8, Math.min(200, e.props.bodyColumns || 40)))}</Text>
        {tree}
      </Box>
    )
  })
}

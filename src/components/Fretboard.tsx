import {
  STANDARD_TUNING,
  fretMarkerPositions,
  isDoubleMarker,
  noteAt,
} from "../fretboardMath";
import type { Step } from "../recordingMachine";

const FRET_COUNT = 24;
const OPEN_AREA_WIDTH = 56;
const FRET_WIDTH = 44;
const STRING_SPACING = 34;
const TOP_PADDING = 32;
const LEFT_PADDING = 24;
const NUT_WIDTH = 8;
const MARKER_COLOR = "#d6b268";
const STRINGS_IN_RENDER_ORDER = Array.from(STANDARD_TUNING.keys()).reverse();
const RENDER_INDEX_BY_STRING = new Map(
  STRINGS_IN_RENDER_ORDER.map((stringIndex, renderIndex) => [stringIndex, renderIndex]),
);

const svgWidth = LEFT_PADDING + OPEN_AREA_WIDTH + NUT_WIDTH + FRET_COUNT * FRET_WIDTH + 32;
const svgHeight = TOP_PADDING * 2 + STRING_SPACING * (STANDARD_TUNING.length - 1);
const boardStartX = LEFT_PADDING + OPEN_AREA_WIDTH + NUT_WIDTH;
const boardEndX = boardStartX + FRET_COUNT * FRET_WIDTH;
const fretIndexes = Array.from({ length: FRET_COUNT + 1 }, (_, index) => index);

function yForString(renderIndex: number) {
  return TOP_PADDING + renderIndex * STRING_SPACING;
}

function xForFretCenter(fret: number) {
  if (fret === 0) {
    return LEFT_PADDING + OPEN_AREA_WIDTH / 2;
  }

  return boardStartX + (fret - 0.5) * FRET_WIDTH;
}

function fretCellBounds(fret: number) {
  if (fret === 0) {
    return {
      width: OPEN_AREA_WIDTH,
      x: LEFT_PADDING,
    };
  }

  return {
    width: FRET_WIDTH,
    x: boardStartX + (fret - 1) * FRET_WIDTH,
  };
}

function badgePosition(step: Step, occurrence: number) {
  const renderIndex = RENDER_INDEX_BY_STRING.get(step.string);

  if (renderIndex === undefined) {
    throw new RangeError(`String index ${step.string} is out of range.`);
  }

  return {
    x: xForFretCenter(step.fret) + occurrence * 7,
    y: yForString(renderIndex) - 20 - occurrence * 16,
  };
}

function renderNaturalNoteLabel(fret: number, y: number, noteName: string) {
  if (fret === 0) {
    return null;
  }

  return (
    <text
      x={xForFretCenter(fret)}
      y={y + 5}
      textAnchor="middle"
      fontSize="14"
      fontWeight="700"
      fill="#fde68a"
      data-note-label="true"
      data-note-name={noteName}
    >
      {noteName}
    </text>
  );
}

interface FretboardProps {
  onNaturalFretClick?: (stringIndex: number, fret: number) => void;
  stepBadges?: Step[];
}

function renderFretCell(
  stringIndex: number,
  fret: number,
  y: number,
  onNaturalFretClick?: (stringIndex: number, fret: number) => void,
) {
  const note = noteAt(stringIndex, fret);
  const { width, x } = fretCellBounds(fret);
  const handleClick =
    note.isNatural && onNaturalFretClick
      ? () => {
          onNaturalFretClick(stringIndex, fret);
        }
      : undefined;

  return (
    <g key={`${stringIndex}-${fret}`}>
      <rect
        data-fretboard-cell="true"
        data-fret={fret}
        data-is-natural={note.isNatural}
        data-string-index={stringIndex}
        x={x}
        y={y - STRING_SPACING / 2}
        width={width}
        height={STRING_SPACING}
        rx={fret === 0 ? 12 : 10}
        fill="transparent"
        cursor={handleClick ? "pointer" : "default"}
        onClick={handleClick}
      />
      {note.isNatural ? renderNaturalNoteLabel(fret, y, note.name) : null}
    </g>
  );
}

function renderStepBadges(stepBadges: Step[]) {
  const occurrencesByPosition = new Map<string, number>();

  return stepBadges.map((step, index) => {
    const key = `${step.string}-${step.fret}`;
    const occurrence = occurrencesByPosition.get(key) ?? 0;

    occurrencesByPosition.set(key, occurrence + 1);

    const { x, y } = badgePosition(step, occurrence);

    return (
      <g
        key={`badge-${index}-${step.string}-${step.fret}`}
        data-fret={step.fret}
        data-step-badge="true"
        data-string-index={step.string}
        data-testid="step-badge"
      >
        <circle cx={x} cy={y} r={11} fill="#fbbf24" stroke="#451a03" strokeWidth={2} />
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="#1c1917"
        >
          {index + 1}
        </text>
      </g>
    );
  });
}

function renderFretMarker(fret: number) {
  const x = xForFretCenter(fret);

  if (!isDoubleMarker(fret)) {
    return [
      <circle
        key={`marker-${fret}`}
        data-marker-type="single"
        cx={x}
        cy={svgHeight / 2}
        r={7}
        fill={MARKER_COLOR}
        opacity={0.9}
      />,
    ];
  }

  return [
    <circle
      key={`marker-${fret}-upper`}
      data-marker-type="double"
      cx={x}
      cy={svgHeight / 2 - 16}
      r={7}
      fill={MARKER_COLOR}
      opacity={0.9}
    />,
    <circle
      key={`marker-${fret}-lower`}
      data-marker-type="double"
      cx={x}
      cy={svgHeight / 2 + 16}
      r={7}
      fill={MARKER_COLOR}
      opacity={0.9}
    />,
  ];
}

export function Fretboard({ onNaturalFretClick, stepBadges = [] }: FretboardProps) {
  return (
    <svg
      role="img"
      aria-label="Guitar fretboard"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="h-auto w-full"
    >
      <rect
        x={LEFT_PADDING}
        y={TOP_PADDING - 18}
        width={svgWidth - LEFT_PADDING * 2}
        height={svgHeight - (TOP_PADDING - 18) * 2}
        rx={28}
        fill="#1c1917"
      />

      {fretMarkerPositions(FRET_COUNT).flatMap(renderFretMarker)}

      {fretIndexes.map((index) => {
        const x = boardStartX + index * FRET_WIDTH;

        return (
          <line
            key={`fret-${index}`}
            x1={x}
            y1={TOP_PADDING - 12}
            x2={x}
            y2={svgHeight - TOP_PADDING + 12}
            stroke={index === 0 ? "#f5deb3" : "#57534e"}
            strokeWidth={index === 0 ? NUT_WIDTH : 2}
            strokeLinecap="round"
          />
        );
      })}

      {STRINGS_IN_RENDER_ORDER.map((stringIndex, renderIndex) => {
        const y = yForString(renderIndex);
        const stringWidth = 1.8 + renderIndex * 0.5;
        const openNote = noteAt(stringIndex, 0);

        return (
          <g key={`string-${stringIndex}`}>
            <line
              x1={LEFT_PADDING}
              y1={y}
              x2={boardEndX}
              y2={y}
              stroke="#d6d3d1"
              strokeWidth={stringWidth}
              opacity={0.9}
            />
            <text
              x={xForFretCenter(0)}
              y={y + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#f5f5f4"
              data-note-label="true"
              data-note-name={openNote.name}
            >
              {openNote.name}
            </text>
          </g>
        );
      })}

      {STRINGS_IN_RENDER_ORDER.map((stringIndex, renderIndex) => {
        const y = yForString(renderIndex);

        return fretIndexes.map((fret) =>
          renderFretCell(stringIndex, fret, y, onNaturalFretClick),
        );
      })}

      {renderStepBadges(stepBadges)}
    </svg>
  );
}

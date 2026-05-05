import {
  STANDARD_TUNING,
  fretMarkerPositions,
  isDoubleMarker,
  noteAt,
  naturalsForString,
} from "../fretboardMath";

const FRET_COUNT = 24;
const OPEN_AREA_WIDTH = 56;
const FRET_WIDTH = 44;
const STRING_SPACING = 34;
const TOP_PADDING = 32;
const LEFT_PADDING = 24;
const NUT_WIDTH = 8;

const svgWidth = LEFT_PADDING + OPEN_AREA_WIDTH + NUT_WIDTH + FRET_COUNT * FRET_WIDTH + 32;
const svgHeight = TOP_PADDING * 2 + STRING_SPACING * (STANDARD_TUNING.length - 1);
const boardStartX = LEFT_PADDING + OPEN_AREA_WIDTH + NUT_WIDTH;
const boardEndX = boardStartX + FRET_COUNT * FRET_WIDTH;

function yForString(renderIndex: number) {
  return TOP_PADDING + renderIndex * STRING_SPACING;
}

function xForFretCenter(fret: number) {
  if (fret === 0) {
    return LEFT_PADDING + OPEN_AREA_WIDTH / 2;
  }

  return boardStartX + (fret - 0.5) * FRET_WIDTH;
}

export function Fretboard() {
  const stringsInRenderOrder = [...STANDARD_TUNING.keys()].reverse();

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

      {fretMarkerPositions(FRET_COUNT).flatMap((fret) => {
        const x = xForFretCenter(fret);
        const markerColor = "#d6b268";

        if (!isDoubleMarker(fret)) {
          return [
            <circle
              key={`marker-${fret}`}
              data-marker-type="single"
              cx={x}
              cy={svgHeight / 2}
              r={7}
              fill={markerColor}
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
            fill={markerColor}
            opacity={0.9}
          />,
          <circle
            key={`marker-${fret}-lower`}
            data-marker-type="double"
            cx={x}
            cy={svgHeight / 2 + 16}
            r={7}
            fill={markerColor}
            opacity={0.9}
          />,
        ];
      })}

      {Array.from({ length: FRET_COUNT + 1 }, (_, index) => {
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

      {stringsInRenderOrder.map((stringIndex, renderIndex) => {
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

      {stringsInRenderOrder.map((stringIndex, renderIndex) => {
        const y = yForString(renderIndex);

        return naturalsForString(stringIndex, FRET_COUNT)
          .filter((position) => position.fret > 0)
          .map((position) => (
            <text
              key={`${stringIndex}-${position.fret}`}
              x={xForFretCenter(position.fret)}
              y={y + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#fde68a"
              data-note-label="true"
              data-note-name={position.note.name}
            >
              {position.note.name}
            </text>
          ));
      })}
    </svg>
  );
}

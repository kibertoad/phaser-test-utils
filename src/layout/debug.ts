import * as Phaser from "phaser";

type Rectangle = Phaser.Geom.Rectangle;

/**
 * Generate a visual ASCII debug representation of two overlapping rectangles.
 */
export function formatOverlapDebug(
    nameA: string,
    boundsA: Rectangle,
    nameB: string,
    boundsB: Rectangle,
    intersection: Rectangle,
): string {
    const lines: string[] = ["  Visual:"];

    // Compute the combined bounding box
    const minX = Math.min(boundsA.x, boundsB.x);
    const minY = Math.min(boundsA.y, boundsB.y);
    const maxX = Math.max(boundsA.right, boundsB.right);
    const maxY = Math.max(boundsA.bottom, boundsB.bottom);

    const totalW = maxX - minX;
    const totalH = maxY - minY;

    // Scale to fit ~60 chars wide, ~20 rows tall
    const maxCols = 60;
    const maxRows = 20;
    const scaleX = totalW > maxCols ? maxCols / totalW : 1;
    const scaleY = totalH > maxRows ? maxRows / totalH : 1;

    const cols = Math.ceil(totalW * scaleX);
    const rows = Math.ceil(totalH * scaleY);

    // Build grid
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(" "));

    fillRect(grid, boundsA, minX, minY, scaleX, scaleY, "A");
    fillRect(grid, boundsB, minX, minY, scaleX, scaleY, "B");
    fillRect(grid, intersection, minX, minY, scaleX, scaleY, "#");

    // Render
    lines.push(`    A = "${nameA}", B = "${nameB}", # = overlap`);
    for (const row of grid) {
        lines.push("    |" + row.join("") + "|");
    }

    return lines.join("\n");
}

/**
 * Generate a visual ASCII debug representation of a containment failure.
 */
export function formatContainmentDebug(
    childName: string,
    childBounds: Rectangle,
    parentName: string,
    parentBounds: Rectangle,
): string {
    const lines: string[] = ["\n  Overflow:"];

    const overLeft = parentBounds.x - childBounds.x;
    const overRight = childBounds.right - parentBounds.right;
    const overTop = parentBounds.y - childBounds.y;
    const overBottom = childBounds.bottom - parentBounds.bottom;

    if (overLeft > 0) lines.push(`    Left: ${overLeft}px past parent left edge`);
    if (overRight > 0) lines.push(`    Right: ${overRight}px past parent right edge`);
    if (overTop > 0) lines.push(`    Top: ${overTop}px past parent top edge`);
    if (overBottom > 0) lines.push(`    Bottom: ${overBottom}px past parent bottom edge`);

    return lines.join("\n");
}

function fillRect(
    grid: string[][],
    rect: Rectangle,
    originX: number,
    originY: number,
    scaleX: number,
    scaleY: number,
    char: string,
): void {
    const startCol = Math.floor((rect.x - originX) * scaleX);
    const endCol = Math.ceil((rect.right - originX) * scaleX);
    const startRow = Math.floor((rect.y - originY) * scaleY);
    const endRow = Math.ceil((rect.bottom - originY) * scaleY);

    for (let r = startRow; r < endRow && r < grid.length; r++) {
        for (let c = startCol; c < endCol && c < grid[0].length; c++) {
            if (r >= 0 && c >= 0) {
                // '#' (overlap) takes priority over A/B
                if (char === "#" || grid[r][c] === " ") {
                    grid[r][c] = char;
                }
            }
        }
    }
}

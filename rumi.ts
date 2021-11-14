import { readLines } from "https://deno.land/std@0.83.0/io/mod.ts";

/*

sc dc x3
3x sc dc
rnd sc

incs 5 8
5..8 { rnd * sc inc }


def incs { rnd # $/sc inc }
def decs { rnd # $/sc dec }

ml
rnd 6 sc
..5 incs
5 rnd
rnd ss
..8 incs
5 rnd
..3 decs

incs(5)
0..5 { rnd # sc inc }

0..5 sc
5x sc
5x { rnd #x sc inc }



statements sep by commas
commas implcitly inserted at end of each line.
downside is this:
rnd (sc inc)
rnd (sc, inc)


ARRAY EXP
1 2 3 sc
or single num special case
1 2 sc -> expand sc twice
2 sc -> same (not expand once)


4 sc inc
4 (sc inc)

1..4{sc} in


need:
- macro call syntax
- array expansion syntax
- repeats (special case)

optinal rnd (default sc) in tension w/ no cmd separator
rnd
rnd ss ---> parses as `rnd (rnd (ss))`

repeat 4x is special case of expanding expression on [0,1,2,3] aka 0..3
characters to try . : # $ / * 

turn
row
color

*/

type Inst =
  | InstRepeat
  | InstStitch
  | InstMagic
  | InstSkip
  | InstTurn
  | InstColor
  | InstRow
  | InstRound
  | InstIncs
  | InstDecs;

enum InstKind {
  Repeat = "<repeat>",
  Stitch = "<stitch>",
  Magic = "ml",
  Skip = "skip",
  Turn = "turn",
  Color = "col",
  Row = "row",
  Round = "rnd",
  Incs = "incs",
  Decs = "decs",
}

interface InstRepeat {
  kind: InstKind.Repeat;
  insts: Inst[];
  times: number;
}

interface InstStitch {
  kind: InstKind.Stitch;
  stitch: Stitch;
}

interface InstMagic {
  kind: InstKind.Magic;
}

interface InstTurn {
  kind: InstKind.Turn;
}

interface InstSkip {
  kind: InstKind.Skip;
}

interface InstColor {
  kind: InstKind.Color;
}

interface InstRow {
  kind: InstKind.Row;
  insts: Inst[];
}

interface InstRound {
  kind: InstKind.Round;
  insts: Inst[];
}

interface InstIncs {
  kind: InstKind.Incs;
  to: number;
}

interface InstDecs {
  kind: InstKind.Decs;
  to: number;
}

interface Machine {
  stitch: number;
  stitch_of_dim: number;
  dim: Dim;
  dim_idx: number;
  dim_size: number;
  gap: number;
  join: number;
}

enum Dim {
  Row,
  Round,
}

// registers
// - %t stitch count (total)
// - %n stitch count (of row/round)
// - %m row or round mode
// - %r row/round count
// - %s row/round size
// - %g inc/dec gap
// - %j join coords

// rnd(E) = while %n < %s { E }
// row(E) = ss, turn, while %n < %s { E }
// incs({S = sc} V) = while %g < V { rnd (S x%g, inc), %g++ }

const Stitches = ["ch", "ss", "sc", "hdc", "dc", "tc", "inc", "dec"];
type Stitch = typeof Stitches;

interface Position {
  row: number,
  col: number,
}

interface Token {
  text: string,
  start: Position,
  end: Position,
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let inSpace = true;
  let startIdx = 0, startPos = {row: 1, col: 1};
  let idx = startIdx, pos = {...startPos};
  function emit() {
    if (idx != startIdx) {
      tokens.push({
        text: input.slice(startIdx, idx),
        start: startPos,
        end: pos,
      });
      startPos = {...pos};
      startIdx = idx;
    }
  }
  for (idx = 0; idx < input.length; idx++) {
    const c = input[idx];
    if ((c.trim() === "") !== inSpace) {
      inSpace = !inSpace;
      emit();
    }
    if (c === "\n") {
      pos.row++;
      pos.col = 1;
    } else {
      pos.col++;
    }
  }
  emit();
  return tokens;
}

class ParseError extends Error {}

function parse(tokens: string[]): Inst[] {
  let idx = 0;

  function eof(): boolean {
    return idx == tokens.length;
  }
  function peek(): string {
    return tokens[idx];
  }
  function consume(): string {
    return tokens[idx++];
  }
  function exactly(expected: string) {
    const actual = consume();
    if (actual != expected) {
      throw new ParseError(`expected '${expected}', got '${actual}'`);
    }
    return actual;
  }
  function anyOf(options: string[]) {
    const actual = consume();
    if (!options.includes(actual)) {
      const str = options.join("', '");
      throw new ParseError(`expected one of ['${str}'], got '${actual}'`);
    }
    return actual;
  }

  function inst(): Inst {
    return {kind: InstKind.Magic};
  }

  function instList(): Inst[] {
    if (eof()) {
      return [];
    }
    const res = [inst()];
    while (!eof()) {
      exactly(",");
      res.push(inst());
    }
    return res;
  }

  return instList();
}

for await (let line of readLines(Deno.stdin)) {
  console.log(JSON.stringify(tokenize(line), null, 2));
}

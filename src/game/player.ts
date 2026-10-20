import { MAX_WIN, WIN_TIERS, type Flame, type ShowKind } from '../engine/config';
import type { Book } from '../engine/round';
import { celebrate, showEnd, showIntro } from './overlays';
import { sfx } from './sfx';
import type { Stage } from './stage';
import { clock, wait } from './tween';
import { money, type Ui } from './ui';

const ACT_NAMES = ['', 'Act I', 'Act II', 'Act III', 'Act IV', 'Act V'];

/** Plays a book's events on the stage. Resolves with the total win in currency. */
export async function playBook(book: Book, stake: number, stage: Stage, ui: Ui, auto: boolean): Promise<number> {
  let show: ShowKind | null = null;
  let showStartTotal = 0;
  let spinsLeft = 0;
  let flame: Flame = 1;
  let lanterns = 1;
  let shown = 0; // running total already displayed, in × stake

  const hud = (total: number) => {
    if (show) ui.showHud(show, spinsLeft, money((total - showStartTotal) * stake), flame, lanterns);
  };

  for (const e of book.events) {
    switch (e.type) {
      case 'reveal': {
        if (show) {
          spinsLeft = e.spinsTotal - e.spin;
          hud(shown);
        }
        sfx.spin();
        await Promise.all([stage.reveal(e.board, show !== null), stage.lap()]);
        break;
      }
      case 'lantern': {
        flame = e.flame;
        sfx.creak();
        await stage.setLanterns(e.lanterns, e.flame);
        ui.compass(e.lanterns[0]);
        sfx.flame(e.flame);
        if (e.flame === 3) stage.embers();
        await wait(clock.turbo ? 120 : 380); // the half-second where the player reads the light
        break;
      }
      case 'act': {
        if (e.act > 1) {
          sfx.encore();
          const big = e.act === 5 ? 'FULL CIRCLE' : 'ENCORE!';
          const small = e.act === 5 ? 'The Bonfire returns' : ACT_NAMES[e.act];
          void ui.banner(big, small, e.act === 5 ? 'ink' : '', 700);
          void stage.jolt();
          await stage.clearShadows();
          stage.clearFrames();
          await stage.setLanterns(e.lanterns, e.flame);
          ui.compass(e.lanterns[0]);
          if (e.flame === 3) stage.embers(26);
        }
        sfx.shadow();
        await stage.cast(e.rays, e.shadow, e.inkGain, e.ink);
        if (e.inkGain.flat().some((g) => g > 0)) sfx.ink();
        if (e.actWin > 0) {
          const cells = e.wins.flatMap((w) => w.cells);
          const big = e.actWin >= 1;
          sfx.win(big);
          const label = show ? 'Win' : e.act > 1 ? `${ACT_NAMES[e.act]} win` : 'Win';
          await Promise.all([
            stage.showWin(cells, clock.turbo ? 600 : 950),
            ui.countUp(label, shown * stake, e.totalWin * stake, clock.turbo ? 300 : 600, big),
          ]);
          shown = e.totalWin;
          hud(shown);
        }
        break;
      }
      case 'scatter': {
        sfx.ticket();
        await Promise.all([stage.flare(e.cells), ui.banner(`${e.cells.length} TICKETS`, 'Admit one · All Hallows\'', '', 900)]);
        await ui.countUp('Win', shown * stake, e.totalWin * stake, 400, true);
        shown = e.totalWin;
        break;
      }
      case 'showStart': {
        show = e.show;
        showStartTotal = shown;
        spinsLeft = e.spins;
        flame = e.flame;
        lanterns = e.lanterns;
        stage.clearFrames();
        await showIntro(e.show, e.spins, auto);
        await stage.setShow(e.show);
        stage.setInkGrid(e.ink);
        hud(shown);
        break;
      }
      case 'match': {
        sfx.match();
        const prevFlame = flame;
        flame = e.flame;
        lanterns = e.lanterns;
        await stage.flare(e.cells);
        await ui.banner(prevFlame < e.flame ? 'THE FLAME RISES' : 'ANOTHER LANTERN', e.flame > prevFlame ? `Now a ${['', 'Candle', 'Lamp', 'Bonfire'][e.flame]}` : `${e.lanterns} Lanterns light the stage`, '', 1000);
        hud(shown);
        break;
      }
      case 'retrigger': {
        sfx.ticket();
        spinsLeft += e.spins;
        await stage.flare(e.cells);
        await ui.banner(`+${e.spins} SPINS`, 'The stage manager runs on', '', 1000);
        hud(shown);
        break;
      }
      case 'showEnd': {
        await wait(400);
        await showEnd(e.show, e.showWin * stake, e.deepestInk, e.encores, e.fullCircles, auto);
        ui.hideHud();
        await stage.setShow(null);
        await stage.setLanterns(['left'], 1);
        show = null;
        break;
      }
      case 'cap': {
        await ui.banner('FINAL BOW', `${MAX_WIN.toLocaleString('en-US')}× · the maximum win`, 'ink', 1400);
        break;
      }
    }
  }

  const total = book.payout * stake;
  // Big wins get the Applause Ladder. Small wins stay quiet: a win below the stake is never
  // celebrated.
  let level = -1;
  WIN_TIERS.forEach((t, i) => { if (book.payout >= t.at) level = i; });
  if (book.capped) await celebrate('FINAL BOW', total, 4, true);
  else if (level >= 0) await celebrate(WIN_TIERS[level].name, total, level, false);
  const lit = book.payout >= 1;
  ui.marquee(book.payout > 0 ? (lit ? 'Win' : 'Returned') : 'No win', book.payout > 0 ? money(total) : '', lit);
  return total;
}

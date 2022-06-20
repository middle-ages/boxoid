import {
  eq as EQ,
  function as FN,
  functor as FU,
  hkt as HKT,
  show as SH,
  tuple as TU,
} from 'fp-ts';
import { construct } from 'fp-ts-std/Function';
import { untupled } from 'fp-ts/lib/function';
import { showFor } from 'util/fp-ts';
import { Unary } from 'util/function';
import { pluck } from 'util/object';
import { squareMapSnd } from 'util/tuple';

export type HFix<F extends HKT.URIS2, E> = HKT.Kind2<F, E, Fix<F, E>>;

/** `Fix<F, E> ≃ HKT.Kind2<F, E, Fix<F, E>>` */
export class Fix<F extends HKT.URIS2, E> {
  constructor(readonly unfixed: HFix<F, E>) {}
}

export type Algebra<F extends HKT.URIS2, E, A> = Unary<HKT.Kind2<F, E, A>, A>;

export type AlgebraOf<F extends HKT.URIS2, A> = <E>(
  term: HKT.Kind2<F, E, A>,
) => A;

export type Coalgebra<F extends HKT.URIS2, E, A> = Unary<A, HKT.Kind2<F, E, A>>;

export type RAlgebra<F extends HKT.URIS2, E, A> = Unary<
  HKT.Kind2<F, E, [Fix<F, E>, A]>,
  A
>;

export type fix = <F extends HKT.URIS2, E>(f: HFix<F, E>) => Fix<F, E>;

export type unfix = <F extends HKT.URIS2, E>(fixed: Fix<F, E>) => HFix<F, E>;

export const fix: fix = untupled(construct(Fix));

export const unfix: unfix = pluck('unfixed');

export type EqFix = <F extends HKT.URIS2, E>(
  eq: EQ.Eq<HFix<F, E>>,
) => EQ.Eq<Fix<F, E>>;

export const eqFix: EqFix = FN.pipe('unfixed', pluck, EQ.contramap);

export const showFix = <F extends HKT.URIS2, E>(
  sh: SH.Show<HFix<F, E>>,
): SH.Show<Fix<F, E>> => showFor(FN.flow(unfix, sh.show));

export const cata =
  <F extends HKT.URIS2>(F: FU.Functor2<F>) =>
  <E, A>(algebra: Algebra<F, E, A>) =>
    function self(root: Fix<F, E>): A {
      return algebra(F.map(unfix(root), self));
    };

export const ana =
  <F extends HKT.URIS2>(F: FU.Functor2<F>) =>
  <E, A>(coalgebra: Coalgebra<F, E, A>) =>
    function self(carrier: A): Fix<F, E> {
      return fix(F.map(coalgebra(carrier), self));
    };

export const hylo =
  <F extends HKT.URIS2>(F: FU.Functor2<F>) =>
  <E, A, B>(algebra: Algebra<F, E, B>, coalgebra: Coalgebra<F, E, A>) =>
    function self(carrier: A): B {
      const before: HKT.Kind2<F, E, A> = coalgebra(carrier),
        after: HKT.Kind2<F, E, B> = F.map(before, self);
      return algebra(after);
    };

export type para = <F extends HKT.URIS2>(
  F: FU.Functor2<F>,
) => <E, A>(ralgebra: RAlgebra<F, E, A>) => Unary<Fix<F, E>, A>;

export const para: para = <F extends HKT.URIS2>(F: FU.Functor2<F>) => {
  const paraF = para(F);

  return <E, A>(ralgebra: RAlgebra<F, E, A>) => {
    const fanout: Unary<Fix<F, E>, [Fix<F, E>, A]> = FN.pipe(
      ralgebra,
      paraF,
      squareMapSnd,
    );
    return FN.flow((a: Fix<F, E>) => F.map(a.unfixed, fanout), ralgebra);
  };
};

/** Fuse two algbras */
export const zipAlgebras =
  <F extends HKT.URIS2>(F: FU.Functor2<F>) =>
  <E, A>(fst: Algebra<F, E, A>) =>
  <B>(snd: Algebra<F, E, B>): Algebra<F, E, [A, B]> =>
  term =>
    [FN.pipe(F.map(term, TU.fst), fst), FN.pipe(F.map(term, TU.snd), snd)];

/** Fuse two algbras */
export const zipAlgebrasOf =
  <F extends HKT.URIS2>(F: FU.Functor2<F>) =>
  <A, B>(fst: AlgebraOf<F, A>, snd: AlgebraOf<F, B>) =>
  <E>(term: HKT.Kind2<F, E, [A, B]>): [A, B] =>
    FN.pipe(term, zipAlgebras(F)<E, A>(fst)<B>(snd));
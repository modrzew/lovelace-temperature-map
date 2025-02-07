import memoizeOne from 'memoize-one';

const collator = memoizeOne(
  (language: string | undefined) => new Intl.Collator(language),
);

const caseInsensitiveCollator = memoizeOne(
  (language: string | undefined) =>
    new Intl.Collator(language, { sensitivity: 'accent' }),
);

export const stringCompare = (
  a: string,
  b: string,
  language: string | undefined = undefined,
) => {
  return collator(language).compare(a, b);
};

export const caseInsensitiveStringCompare = (
  a: string,
  b: string,
  language: string | undefined = undefined,
) => {
  return caseInsensitiveCollator(language).compare(a, b);
};

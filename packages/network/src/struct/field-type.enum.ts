export enum FieldType {
  string,
  int,
  uint,
  bigint,
  biguint,
  float,
  double,
  byte,
  bytes,
  array,
  object,
  /** LSB-first bitmap decoded as zero-based indices of set bits. */
  bitset,
}

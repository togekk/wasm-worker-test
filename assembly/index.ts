import 'allocator/arena';
export { memory };

export function get_array(len: i32): Float64Array {
  const a = new Float64Array(len);
  return a;
}
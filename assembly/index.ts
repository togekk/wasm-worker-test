import 'allocator/arena';
export { memory };

export function fib_loop(): void {
  for (let i = 0; i < 4000; i++) fib(0, 1, i);
}

export function fib_loop_full(): void {
  for (let i = 0; i < 50; i++)
    for (let j = 0; j < 4000; j++) fib(0, 1, j);
}

function fib(curr: f64, next: f64, n: f64): f64 {
  if (n == 0) {
    return curr;
  }
  else {
    return fib(next, curr + next, n - 1);
  }
}

export function fib_ext(curr: f64, next: f64, n: f64): f64 {
  if (n == 0) {
    return curr;
  }
  else {
    return fib(next, curr + next, n - 1);
  }
}
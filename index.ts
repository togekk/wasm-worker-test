import wasmWorker from 'wasm-worker';


(async () => {
    const wasm = await wasmWorker('optimized.wasm');

    const fib = (curr: number, next: number, n: number): number {
        if (n == 0) {
            return curr;
        }
        else {
            return fib(next, curr + next, n - 1);
        }
    }

    const container = document.body.appendChild(document.createElement('div'));
    const show_log = text => container.appendChild(document.createElement('div')).appendChild(document.createTextNode(text));

    const arr = new Float64Array(5);
    arr.fill(0);

    const msg = ['js loop :', 'wasm with js loop :', 'wasm with wasm loop :', 'wasm with js loop and web worker :', 'wasm with wasm loop and web worker :'];

    const benchmark = async count => {
        show_log('Test ' + count);

        const t0 = performance.now();
        for (let i = 0; i < 10000; i++) fib(0, 1, i);
        const t1 = performance.now();
        show_log(msg[0] + (t1 - t0) + ' ms');
        arr[0] += t1 - t0;

        const t2 = performance.now();
        const fib_promise = async n => await wasm.exports.fib_ext(0, 1, n);
        const promises = [];
        for (let i = 0; i < 10000; i++) promises.push(fib_promise(i));
        await Promise.all(promises);
        const t3 = performance.now();
        show_log(msg[1] + (t3 - t2) + ' ms');
        arr[1] += t3 - t2;

        const t4 = performance.now();
        await wasm.exports.fib_loop();
        const t5 = performance.now();
        show_log(msg[2] + (t5 - t4) + ' ms');
        arr[2] += t5 - t4;

        const t6 = performance.now();
        await wasm.run(({ instance }) => {
            for (let i = 0; i < 10000; i++) instance.exports.fib_ext(0, 1, i);
        });
        const t7 = performance.now();
        show_log(msg[3] + (t7 - t6) + ' ms');
        arr[3] += t7 - t6;

        const t8 = performance.now();
        await wasm.run(({ instance }) => {
            instance.exports.fib_loop();
        });
        const t9 = performance.now();
        show_log(msg[4] + (t9 - t8) + ' ms');
        arr[4] += t9 - t8;
    }

    for (let i = 1; i < 11; i++) await benchmark(i);
    show_log('Average');
    for (let i = 0; i < 5; i++) show_log(msg[i] + (arr[i] / 10));
})();

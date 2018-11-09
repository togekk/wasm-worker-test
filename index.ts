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

    show_log('Loop: 5000 * 20');

    const arr = new Float64Array(5);
    arr.fill(0);

    const msg = ['js loop :', 'wasm with js loop :', 'wasm with wasm loop :', 'wasm with js loop and web worker :', 'wasm with wasm loop and web worker :'];

    const benchmark = async count => {
        show_log('Test ' + count);

        const t0 = performance.now();
        // const fib_promise = async n => new Promise(resolve => {
        //     fib(0, 1, n);
        //     resolve();
        // });
        // let promises = new Array();
        // for (let i = 0; i < 20; i++)
        //     for (let j = 0; j < 5000; j++) promises.push(fib_promise(j));
        // await Promise.all(promises);
        for (let i = 0; i < 20; i++)
            for (let j = 0; j < 5000; j++) fib(0, 1, j);
        const t1 = performance.now();
        show_log(msg[0] + (t1 - t0) + ' ms');
        arr[0] += t1 - t0;

        const t2 = performance.now();
        const fib_promise1 = async n => wasm.exports.fib_ext(0, 1, n);
        let promises = new Array();
        for (let i = 0; i < 20; i++)
            for (let j = 0; j < 5000; j++) promises.push(fib_promise1(j));
        await Promise.all(promises);
        const t3 = performance.now();
        show_log(msg[1] + (t3 - t2) + ' ms');
        arr[1] += t3 - t2;

        const t4 = performance.now();
        const fib_promise2 = async () => wasm.exports.fib_loop();
        promises = new Array();
        for (let i = 0; i < 20; i++) promises.push(fib_promise2());
        await Promise.all(promises);
        const t5 = performance.now();
        show_log(msg[2] + (t5 - t4) + ' ms');
        arr[2] += t5 - t4;

        const t6 = performance.now();
        const fib_promise3 = async () => wasm.run(({ instance }) => {
            for (let i = 0; i < 5000; i++) instance.exports.fib_ext(0, 1, i);
        });
        promises = new Array();
        for (let i = 0; i < 20; i++) promises.push(fib_promise3());
        await Promise.all(promises);
        const t7 = performance.now();
        show_log(msg[3] + (t7 - t6) + ' ms');
        arr[3] += t7 - t6;

        const t8 = performance.now();
        const fib_promise4 = async () => wasm.run(({ instance }) => {
            instance.exports.fib_loop();
        });
        promises = new Array();
        for (let i = 0; i < 20; i++) promises.push(fib_promise4());
        await Promise.all(promises);
        const t9 = performance.now();
        show_log(msg[4] + (t9 - t8) + ' ms');
        arr[4] += t9 - t8;
    }

    for (let i = 1; i < 11; i++) await benchmark(i);
    show_log('Average');
    for (let i = 0; i < 5; i++) show_log(msg[i] + (arr[i] / 10) + ' ms');
})();

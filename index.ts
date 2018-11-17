import wasmWorker from 'wasm-worker';
import 'bootstrap/dist/css/bootstrap.min.css'
import { resolve } from 'url';

(async () => {
    const options = {
        getImportObject: () => {
            return {
                fib_js: () => {
                    const fib = (curr: number, next: number, n: number): number => {
                        if (n == 0) {
                            return curr;
                        }
                        else {
                            return fib(next, curr + next, n - 1);
                        }
                    }

                    for (let i = 0; i < 50; i++)
                        for (let j = 0; j < 4000; j++) fib(0, 1, j);
                }
            }
        }
    };


    const wasm = await wasmWorker('optimized.wasm', options);
    const wasm_direct = (await WebAssembly.instantiateStreaming(await fetch('optimized.wasm'))).instance;

    const fib = (curr: number, next: number, n: number): number => {
        if (n == 0) {
            return curr;
        }
        else {
            return fib(next, curr + next, n - 1);
        }
    }

    const log = document.getElementById('log');
    const show_log = text => log.appendChild(document.createElement('div'))
        .appendChild(document.createTextNode(text));
    const show_title = text => {
        const div = document.createElement('h3');
        div.className = 'mt-3';
        log.appendChild(div).appendChild(document.createTextNode(text));
    }

    show_log('Loop: 4000 * 50');
    show_title('Test ' + 1);



    const msg = ['js loop: ',
        'wasm with js loop (direct): ',
        'wasm with wasm loop (direct): ',
        'js loop with wasm-worker: ',
        'wasm with js loop and wasm-worker (direct): ',
        'wasm with wasm loop and wasm-worker (direct): ',
        'wasm with js loop and wasm-worker (with js function): ',
        'wasm with wasm loop and wasm-worker (with js function): ',
        'half wasm loop (direct) and half wasm loop (wasm-worker with js function): ',
        'pre-declared function with js loop: ',
        'web-worker overhead: '
    ];

    const arr = new Float64Array(msg.length);
    arr.fill(0);

    let fib_promise, fib_promise2, promises, t0, t1;
    const func = new Array();

    func[0] = () => {
        return new Promise(resolve => {
            const t2 = performance.now();
            for (let i = 0; i < 50; i++)
                for (let j = 0; j < 4000; j++) fib(0, 1, j);
            const t3 = performance.now();
            resolve();
        })
    }

    func[1] = () => {
        return new Promise(resolve => {
            for (let i = 0; i < 50; i++)
                for (let j = 0; j < 4000; j++) wasm_direct.exports.fib_ext(0, 1, j);
            resolve();
        })
    }

    func[2] = () => {
        return new Promise(resolve => {
            wasm_direct.exports.fib_loop_full();
            resolve();
        })
    }

    func[3] = async () => {
        await wasm.run(() => {
            const fib = (curr: number, next: number, n: number): number => {
                if (n == 0) {
                    return curr;
                }
                else {
                    return fib(next, curr + next, n - 1);
                }
            }

            for (let i = 0; i < 50; i++)
                for (let j = 0; j < 4000; j++) fib(0, 1, j);
        });
    }

    func[4] = async () => {
        fib_promise = async n => wasm.exports.fib_ext(0, 1, n);
        promises = new Array();
        for (let i = 0; i < 50; i++)
            for (let j = 0; j < 4000; j++) promises.push(fib_promise(j));
        await Promise.all(promises);
    }

    func[5] = async () => {
        fib_promise = async () => wasm.exports.fib_loop();
        promises = new Array();
        for (let i = 0; i < 50; i++) promises.push(fib_promise());
        await Promise.all(promises);
    }

    func[6] = async () => {
        fib_promise = async () => wasm.run(({ instance }) => {
            for (let i = 0; i < 4000; i++) instance.exports.fib_ext(0, 1, i);
        });
        promises = new Array();
        for (let i = 0; i < 50; i++) promises.push(fib_promise());
        await Promise.all(promises);
    }

    func[7] = async () => {
        fib_promise = async () => wasm.run(({ instance }) => {
            instance.exports.fib_loop();
        });
        promises = new Array();
        for (let i = 0; i < 50; i++) promises.push(fib_promise());
        await Promise.all(promises);
    }

    func[8] = async () => {
        fib_promise = async () => wasm.run(({ instance }) => {
            instance.exports.fib_loop();
        });
        const fib_promise2 = () => {
            return new Promise(resolve => {
                wasm_direct.exports.fib_loop();
                resolve();
            })
        };
        promises = new Array();
        for (let i = 0; i < 25; i++) promises.push(fib_promise());
        for (let i = 0; i < 25; i++) promises.push(fib_promise2());
        await Promise.all(promises);
    }

    func[9] = async () => {
        await wasm.run(({ importObject }) => {
            importObject.fib_js();
        });
    }

    func[10] = async () => {
        await wasm.run((params) => {
            const sum = params[1] - params[0];
            return sum;
        }, [1, 2]);
    }

    const benchmark = async count => {
        for (let i = 0; i < func.length; i++) {
            t0 = performance.now();
            await func[i]();
            t1 = performance.now();
            show_log(msg[i] + (t1 - t0) + ' ms');
            arr[i] += t1 - t0;
        }

        show_title('Test ' + (count + 1));
        count++;
        if (count > 10) {
            show_title('Average');
            for (let i = 0; i < msg.length; i++) show_log(msg[i] + (arr[i] / 10) + ' ms');
        } else {
            setTimeout(() => {
                benchmark(count);
            }, 100);
        }
    }

    const code = document.getElementById('code');
    code.value =
        `       func[0] = () => {
            return new Promise(resolve => {
                const t2 = performance.now();
                for (let i = 0; i < 50; i++)
                    for (let j = 0; j < 4000; j++) fib(0, 1, j);
                const t3 = performance.now();
                resolve();
            })
        }
    
        func[1] = () => {
            return new Promise(resolve => {
                for (let i = 0; i < 50; i++)
                    for (let j = 0; j < 4000; j++) wasm_direct.exports.fib_ext(0, 1, j);
                resolve();
            })
        }
    
        func[2] = () => {
            return new Promise(resolve => {
                wasm_direct.exports.fib_loop_full();
                resolve();
            })
        }
    
        func[3] = async () => {
            await wasm.run(() => {
                const fib = (curr: number, next: number, n: number): number => {
                    if (n == 0) {
                        return curr;
                    }
                    else {
                        return fib(next, curr + next, n - 1);
                    }
                }
    
                for (let i = 0; i < 50; i++)
                    for (let j = 0; j < 4000; j++) fib(0, 1, j);
            });
        }
    
        func[4] = async () => {
            fib_promise = async n => wasm.exports.fib_ext(0, 1, n);
            promises = new Array();
            for (let i = 0; i < 50; i++)
                for (let j = 0; j < 4000; j++) promises.push(fib_promise(j));
            await Promise.all(promises);
        }
    
        func[5] = async () => {
            fib_promise = async () => wasm.exports.fib_loop();
            promises = new Array();
            for (let i = 0; i < 50; i++) promises.push(fib_promise());
            await Promise.all(promises);
        }
    
        func[6] = async () => {
            fib_promise = async () => wasm.run(({ instance }) => {
                for (let i = 0; i < 4000; i++) instance.exports.fib_ext(0, 1, i);
            });
            promises = new Array();
            for (let i = 0; i < 50; i++) promises.push(fib_promise());
            await Promise.all(promises);
        }
    
        func[7] = async () => {
            fib_promise = async () => wasm.run(({ instance }) => {
                instance.exports.fib_loop();
            });
            promises = new Array();
            for (let i = 0; i < 50; i++) promises.push(fib_promise());
            await Promise.all(promises);
        }
    
        func[8] = async () => {
            fib_promise = async () => wasm.run(({ instance }) => {
                instance.exports.fib_loop();
            });
            const fib_promise2 = () => {
                return new Promise(resolve => {
                    wasm_direct.exports.fib_loop();
                    resolve();
                })
            };
            promises = new Array();
            for (let i = 0; i < 25; i++) promises.push(fib_promise());
            for (let i = 0; i < 25; i++) promises.push(fib_promise2());
            await Promise.all(promises);
        }
    
        func[9] = async () => {
            await wasm.run(({ importObject }) => {
                importObject.fib_js();
            });
        }
    
        func[10] = async () => {
            await wasm.run((params) => {
                const sum = params[1] - params[0];
                return sum;
            }, [1, 2]);
        }`;

    setTimeout(async () => {
        benchmark(1);
    }, 100);
})();

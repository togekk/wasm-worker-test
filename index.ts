import wasmWorker from 'wasm-worker';

wasmWorker('optimized.wasm')
    .then(module => {
        return module.exports.add(1, 2);
    })
    .then(sum => {
        console.log('1 + 2 = ' + sum);
    })
    .catch(ex => {
        console.error(ex);
    });
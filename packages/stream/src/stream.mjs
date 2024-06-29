import DefaultStream, {
  _isUint8Array,
  _uint8ArrayToBuffer,
  addAbortSignal,
  compose,
  destroy,
  Duplex,
  finished,
  isDisturbed,
  isErrored,
  isReadable,
  PassThrough,
  pipeline,
  promises,
  Readable,
  Stream,
  Transform,
  Writable,
} from 'readable-stream';

export default DefaultStream;

// Explicit export naming is needed for ESM
export {
  _isUint8Array,
  _uint8ArrayToBuffer,
  addAbortSignal,
  compose,
  destroy,
  Duplex,
  finished,
  isDisturbed,
  isErrored,
  isReadable,
  PassThrough,
  pipeline,
  promises,
  Readable,
  Stream,
  Transform,
  Writable,
};

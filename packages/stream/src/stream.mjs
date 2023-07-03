import DefaultStream, {
  _uint8ArrayToBuffer,
  _isUint8Array,
  isDisturbed,
  isErrored,
  isReadable,
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
  addAbortSignal,
  finished,
  destroy,
  pipeline,
  compose,
  promises,
  Stream
} from 'readable-stream';

export default DefaultStream;

// Explicit export naming is needed for ESM
export {
  _uint8ArrayToBuffer,
  _isUint8Array,
  isDisturbed,
  isErrored,
  isReadable,
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
  addAbortSignal,
  finished,
  destroy,
  pipeline,
  compose,
  promises,
  Stream
};

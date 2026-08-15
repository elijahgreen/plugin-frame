// Child document loaded through `frameSrc`. Unlike the srcdoc path, nothing is
// inlined here: the page instantiates ChildPlugin itself, exactly as a consumer
// would.
import { ChildPlugin } from '../../src/child';

// Set on window by the ChildPlugin constructor, so it is only readable once the
// methods below actually run.
declare const application: {
  hostMethod: (num: number) => Promise<number>;
};

new ChildPlugin({
  childMethod: (num: number) => num * 2,
  childCallsHost: (num: number) => application.hostMethod(num),
});

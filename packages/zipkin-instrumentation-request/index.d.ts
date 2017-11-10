import {Tracer} from "zipkin"

declare function wrapRequest<T>(request: T, options: {tracer: Tracer, serviceName?: string, remoteServiceName?: string}): T;

export = wrapRequest
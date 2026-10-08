export default function ProtocolDiagram({
  steps,
}: {
  steps: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <figure className="engineering-sequence" aria-label="协议时序图">
      <div className="sequence-peers">
        <strong>发起方</strong>
        <strong>响应方</strong>
      </div>
      <ol>
        {steps.map(([direction, message], i) => {
          const local = /本地|确认/.test(direction);
          const reverse = /服务端 → 客户端/.test(direction);
          const both = !direction.includes("→") && !local;
          return (
            <li
              key={i}
              data-local={local}
              data-reverse={reverse}
              data-both={both}
            >
              <span className="sequence-direction">
                {String(i + 1).padStart(2, "0")} · {direction}
              </span>
              <div className="sequence-arrow" aria-hidden="true" />
              <p>{message}</p>
            </li>
          );
        })}
      </ol>
      <figcaption>
        横线表示交换公开协议消息；居中的框表示本地计算或策略检查。
      </figcaption>
    </figure>
  );
}

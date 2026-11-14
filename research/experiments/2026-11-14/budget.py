"""Deterministic byte-budget arithmetic. Not a QUIC/TLS implementation or benchmark."""
import json
from pathlib import Path
rows=[]
for received in (1200,2400,3600):
    for target in (6000,12000,18000):
        budget=3*received
        rows.append(dict(received_udp_payload_bytes=received,server_target_wire_bytes=target,
                         unvalidated_budget_bytes=budget,shortfall_bytes=max(0,target-budget)))
assert rows[0]['shortfall_bytes']==2400
assert rows[4]['shortfall_bytes']==4800
assert rows[-1]['shortfall_bytes']==7200
assert 2*(1952+3309)+3309+1120==14951
result={"kind":"arithmetic_model_not_protocol_measurement","assumptions":["no address validation yet","no further received datagrams","no previous server sends","target includes all server UDP payload bytes","loss, pacing, congestion, CPU and packet scheduling are not modeled"],"rows":rows,"mldsa65_two_cert_plus_cv_plus_hybrid_share_lower_bound_bytes":14951}
Path(__file__).with_name('budget-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))

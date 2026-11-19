import json

def run(supply):
    inventory = 1200
    accepted = lost = spill = 0
    for new in supply:
        spill += max(0, inventory + new - 1200)
        inventory = min(1200, inventory + new)
        served = min(25, inventory - 200)
        accepted += served
        lost += 25 - served
        inventory -= served
        assert 200 <= inventory <= 1200
    assert inventory == 1200 + sum(supply) - spill - accepted
    return dict(generated=sum(supply), accepted=accepted, not_admitted=lost, spilled=spill, final_stock=inventory)

data = dict(steady=run([33]*120), shallow=run([0]*30+[66]*30+[33]*60), deep=run([0]*60+[66]*60))
assert len({v["generated"] for v in data.values()}) == 1
assert [v["not_admitted"] for v in data.values()] == [0, 0, 500]
print(json.dumps(data, indent=2))

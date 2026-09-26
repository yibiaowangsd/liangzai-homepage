"""Resolve parameters sharing a source directory without mixing their build labels."""
def select_instance(instances, parameter):
    source = parameter['source'].rstrip('/')
    matches = [label for label, path in instances if path.rstrip('/') == source]
    if parameter['label'] in matches:
        return parameter['label']
    if len(matches) == 1:
        return matches[0]
    if not matches:
        return None
    raise ValueError(f"ambiguous source directory for {parameter['label']}: {matches}")

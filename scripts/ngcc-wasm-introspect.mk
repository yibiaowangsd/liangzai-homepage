# Load after a curated ngcc-harness candidate Makefile. One line per field;
# the caller supplies an absolute output filename and a Make instance label.
ifneq ($(NGCC_WASM_META),)
$(file >$(NGCC_WASM_META),$(NGCC_ID))
$(file >>$(NGCC_WASM_META),$(NGCC_TYPE))
$(file >>$(NGCC_WASM_META),$(NGCC_WASM_LABEL))
$(file >>$(NGCC_WASM_META),$(SRCDIR_$(NGCC_WASM_LABEL)))
$(file >>$(NGCC_WASM_META),$(OBJS_$(NGCC_WASM_LABEL)))
$(file >>$(NGCC_WASM_META),$(SHIMDEFS_ALL_$(NGCC_WASM_LABEL)))
$(file >>$(NGCC_WASM_META),$(LDLIBS_$(NGCC_WASM_LABEL)))
$(file >>$(NGCC_WASM_META),$(HASCXX_$(NGCC_WASM_LABEL)))
endif
.PHONY: ngcc-wasm-introspect
ngcc-wasm-introspect:
	@true

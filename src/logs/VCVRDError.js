export default class VCVRDError extends Error {
    constructor(message, {code}) {
        super(message);
        this._vCVRDError_params = {
            code
        };
    }
    get vCVRDErrorCode() {
         return this._vCVRDError_params.code;
    }
    static NewErrorFromEnumItem(vcVrdEnumItem) {
        return new VCVRDError(vcVrdEnumItem.message, {code: vcVrdEnumItem.code});
    }
}
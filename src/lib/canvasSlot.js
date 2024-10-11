/**
 * A canvas slot to show each detection step
 */
export default class CanvasSlot {
    constructor(slotList) {
        this.slotList = slotList;
        this.currentIndex = 0;

        return this;
    }

    getSlot() {
        if (this.currentIndex >= this.slotList.length) {
            console.warn('Don\'t have more canvas');
            return null;
        }

        let slot = this.slotList[this.currentIndex].value;
        this.currentIndex += 1;

        return slot;
    }
}
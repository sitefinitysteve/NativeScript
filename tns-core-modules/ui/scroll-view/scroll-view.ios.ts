﻿import { ScrollEventData } from ".";
import { View, layout, ScrollViewBase, scrollBarIndicatorVisibleProperty } from "./scroll-view-common";

export * from "./scroll-view-common";

class UIScrollViewDelegateImpl extends NSObject implements UIScrollViewDelegate {
    private _owner: WeakRef<ScrollView>;

    public static initWithOwner(owner: WeakRef<ScrollView>): UIScrollViewDelegateImpl {
        let impl = <UIScrollViewDelegateImpl>UIScrollViewDelegateImpl.new();
        impl._owner = owner;
        return impl;
    }

    public scrollViewDidScroll(sv: UIScrollView): void {
        let owner = this._owner.get();
        if (owner) {
            owner.notify(<ScrollEventData>{
                object: owner,
                eventName: ScrollViewBase.scrollEvent,
                scrollX: owner.horizontalOffset,
                scrollY: owner.verticalOffset
            });

            if (owner.scrollableHeight == owner.verticalOffset) {
                owner.notify(<ScrollEventData>{
                    object: owner,
                    eventName: ScrollViewBase.scrollendEvent,
                    scrollX: owner.horizontalOffset,
                    scrollY: owner.verticalOffset
                });
            }
        }
    }

    public scrollViewWillEndDragging(sv: UIScrollView, velocity: CGPoint, targetContentOffset: interop.Pointer | interop.Reference<CGPoint>): void {
        let owner = this._owner.get();
        if (owner) {
            console.log("End drag");
            console.log(velocity);
            console.log(targetContentOffset);
            owner.notify(<ScrollEventData>{
                object: owner,
                eventName: ScrollViewBase.dragendEvent,
                scrollX: owner.horizontalOffset,
                scrollY: owner.verticalOffset
            });
        }
    }

    public static ObjCProtocols = [UIScrollViewDelegate];
}

export class ScrollView extends ScrollViewBase {
    public nativeViewProtected: UIScrollView;
    private _contentMeasuredWidth: number = 0;
    private _contentMeasuredHeight: number = 0;
    private _delegate: UIScrollViewDelegateImpl;

    constructor() {
        super();
        this.nativeViewProtected = UIScrollView.new();
        this._setNativeClipToBounds();
    }

    _setNativeClipToBounds() {
        // Always set clipsToBounds for scroll-view
        this.nativeViewProtected.clipsToBounds = true;
    }

    protected attachNative() {
        this._delegate = UIScrollViewDelegateImpl.initWithOwner(new WeakRef(this));
        this.nativeViewProtected.delegate = this._delegate;
    }

    protected dettachNative() {
        this.nativeViewProtected.delegate = null;
    }

    protected updateScrollBarVisibility(value) {
        if (this.orientation === "horizontal") {
            this.nativeViewProtected.showsHorizontalScrollIndicator = value;
        } else {
            this.nativeViewProtected.showsVerticalScrollIndicator = value;
        } 
    }

    get horizontalOffset(): number {
        return this.nativeViewProtected.contentOffset.x;
    }

    get verticalOffset(): number {
        return this.nativeViewProtected.contentOffset.y;
    }

    get scrollableWidth(): number {
        if (this.orientation !== "horizontal") {
            return 0;
        }

        return Math.max(0, this.nativeViewProtected.contentSize.width - this.nativeViewProtected.bounds.size.width);
    }

    get scrollableHeight(): number {
        if (this.orientation !== "vertical") {
            return 0;
        }

        return Math.max(0, this.nativeViewProtected.contentSize.height - this.nativeViewProtected.bounds.size.height);
    }

    [scrollBarIndicatorVisibleProperty.getDefault](): boolean {
        return true;
    }
    [scrollBarIndicatorVisibleProperty.setNative](value: boolean) {
        this.updateScrollBarVisibility(value);   
    }

    get ios(): UIView {
        return this.nativeViewProtected;
    }

    public scrollToVerticalOffset(value: number, animated: boolean) {
        if (this.orientation === "vertical") {
            const bounds = this.nativeViewProtected.bounds.size;
            this.nativeViewProtected.scrollRectToVisibleAnimated(CGRectMake(0, value, bounds.width, bounds.height), animated);
        }
    }

    public scrollToHorizontalOffset(value: number, animated: boolean) {
        if (this.orientation === "horizontal") {
            const bounds = this.nativeViewProtected.bounds.size;
            this.nativeViewProtected.scrollRectToVisibleAnimated(CGRectMake(value, 0, bounds.width, bounds.height), animated);
        }
    }

    public onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void {
        // Don't call measure because it will measure content twice.
        const width = layout.getMeasureSpecSize(widthMeasureSpec);
        const widthMode = layout.getMeasureSpecMode(widthMeasureSpec);

        const height = layout.getMeasureSpecSize(heightMeasureSpec);
        const heightMode = layout.getMeasureSpecMode(heightMeasureSpec);

        const density = layout.getDisplayDensity();
        const child = this.layoutView;
        if (!child) {
            this._contentMeasuredWidth = this.effectiveMinWidth * density;
            this._contentMeasuredHeight = this.effectiveMinHeight * density;
        }
        else {
            let childSize: { measuredWidth: number; measuredHeight: number };
            if (this.orientation === "vertical") {
                childSize = View.measureChild(this, child, widthMeasureSpec, layout.makeMeasureSpec(0, layout.UNSPECIFIED));
            }
            else {
                childSize = View.measureChild(this, child, layout.makeMeasureSpec(0, layout.UNSPECIFIED), heightMeasureSpec);
            }

            let w = layout.toDeviceIndependentPixels(childSize.measuredWidth);
            let h = layout.toDeviceIndependentPixels(childSize.measuredHeight);
            this.nativeViewProtected.contentSize = CGSizeMake(w, h);

            this._contentMeasuredWidth = Math.max(childSize.measuredWidth, this.effectiveMinWidth * density);
            this._contentMeasuredHeight = Math.max(childSize.measuredHeight, this.effectiveMinHeight * density);
        }

        const widthAndState = View.resolveSizeAndState(this._contentMeasuredWidth, width, widthMode, 0);
        const heightAndState = View.resolveSizeAndState(this._contentMeasuredHeight, height, heightMode, 0);

        this.setMeasuredDimension(widthAndState, heightAndState);
    }

    public onLayout(left: number, top: number, right: number, bottom: number): void {

        const width = (right - left);
        const height = (bottom - top);

        if (this.orientation === "horizontal") {
            View.layoutChild(this, this.layoutView, 0, 0, Math.max(this._contentMeasuredWidth, width), height);
        }
        else {
            View.layoutChild(this, this.layoutView, 0, 0, width, Math.max(this._contentMeasuredHeight, height));
        }
    }

    public _onOrientationChanged() {
        this.updateScrollBarVisibility(this.scrollBarIndicatorVisible);   
    }
}

ScrollView.prototype.recycleNativeView = "auto";
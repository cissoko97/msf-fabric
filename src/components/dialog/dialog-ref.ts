
// Counter for unique dialog ids.
import {Observable, Subject} from "rxjs";
import {GlobalPositionStrategy, OverlayRef} from "@angular/cdk/overlay";
import {MsfDialogContainer} from "./dialog-container";
import {filter, take} from "rxjs/operators";
import {ESCAPE, hasModifierKey} from "@angular/cdk/keycodes";
import {Keyboard} from "../helpers/keyboard";
import {MsfDialogPosition} from "./dialog-options";

let uniqueId = 0;

/**
 * Reference to a dialog opened via the MsfDialog service.
 *
 * @param T Type of the target component or templateRef.
 * @param R Type of the data passed in the dialog injector.
 */
export class MsfDialogRef<T, R = any> {


  /** The instance of component opened into the dialog. */
  componentInstance: T;

  /** Whether the user is allowed to close the dialog. */
  disableClose: boolean | undefined = this._containerInstance._options.disableClose;

  /** Subject for notifying the user that the dialog has finished opening. */
  private readonly _afterOpened = new Subject<void>();

  /** Subject for notifying the user that the dialog has finished closing. */
  private readonly _afterClosed = new Subject<R | undefined>();

  /** Subject for notifying the user that the dialog has started closing. */
  private readonly _beforeClosed = new Subject<R | undefined>();

  /** Result to be passed to afterClosed. */
  private _result: R | undefined;

  constructor(
    private _overlayRef: OverlayRef, public _containerInstance: MsfDialogContainer,
    readonly id: string = `msf-dialog-${uniqueId++}`) {

    // Pass the id along to the container.
    _containerInstance._id = id;


    // Dispose overlay when closing animation is complete
    _containerInstance._animationStateChanged.pipe(
      filter(event => event.phaseName === 'done' && event.toState === 'exit'),
      take(1)
    ).subscribe(() => this._overlayRef.dispose());


    _overlayRef.detachments().subscribe(() => {
      this._beforeClosed.next(this._result);
      this._beforeClosed.complete();
      this._afterClosed.next(this._result);
      this._afterClosed.complete();
      this.componentInstance = null!;
      this._overlayRef.dispose();
    });

    _overlayRef.keydownEvents()
      .pipe(filter(event => {
        return event.key === Keyboard.Escape && !this.disableClose && !hasModifierKey(event);
      }))
      .subscribe(event => {
        event.preventDefault();
        this.close();
      });
  }


  /**
   * Close the dialog.
   * @param dialogResult Optional result to return to the dialog opener.
   */
  close(dialogResult?: R): void {
    this._result = dialogResult;

    // Transition the backdrop in parallel to the dialog.
    this._containerInstance._animationStateChanged.pipe(
      filter(event => event.phaseName === 'start'),
      take(1)
    )
      .subscribe(() => {
        this._beforeClosed.next(dialogResult);
        this._beforeClosed.complete();
        this._overlayRef.detachBackdrop();
      });

    this._containerInstance._startExitAnimation();
  }


  /**
   * Gets an observable that is notified when the dialog is finished opening.
   */
  afterOpened(): Observable<void> {
    return this._afterOpened.asObservable();
  }

  /**
   * Gets an observable that is notified when the dialog is finished closing.
   */
  afterClosed(): Observable<R | undefined> {
    return this._afterClosed.asObservable();
  }

  /**
   * Gets an observable that is notified when the dialog has started closing.
   */
  beforeClosed(): Observable<R | undefined> {
    return this._beforeClosed.asObservable();
  }

  /**
   * Gets an observable that emits when the overlay's backdrop has been clicked.
   */
  backdropClick(): Observable<MouseEvent> {
    return this._overlayRef.backdropClick();
  }

  /**
   * Gets an observable that emits when keydown events are targeted on the overlay.
   */
  keydownEvents(): Observable<KeyboardEvent> {
    return this._overlayRef.keydownEvents();
  }

  /**
   * Updates the dialog's position.
   * @param position New dialog position.
   */
  updatePosition(position?: MsfDialogPosition): this {
    let strategy = this._getPositionStrategy();

    if (position && (position.left || position.right)) {
      position.left ? strategy.left(position.left) : strategy.right(position.right);
    } else {
      strategy.centerHorizontally();
    }

    if (position && (position.top || position.bottom)) {
      position.top ? strategy.top(position.top) : strategy.bottom(position.bottom);
    } else {
      strategy.centerVertically();
    }

    this._overlayRef.updatePosition();

    return this;
  }

  /**
   * Updates the dialog's width and height.
   * @param width New width of the dialog.
   * @param height New height of the dialog.
   */
  updateSize(width: string = '', height: string = ''): this {
    this._getPositionStrategy().width(width).height(height);
    this._overlayRef.updatePosition();
    return this;
  }

  /** Add a CSS class or an array of classes to the overlay pane. */
  addPanelClass(classes: string | string[]): this {
    this._overlayRef.addPanelClass(classes);
    return this;
  }

  /** Remove a CSS class or an array of classes from the overlay pane. */
  removePanelClass(classes: string | string[]): this {
    this._overlayRef.removePanelClass(classes);
    return this;
  }

  /**
   * Gets an observable that is notified when the dialog is finished opening.
   * @deprecated Use `afterOpened` instead.
   * @breaking-change 8.0.0
   */
  afterOpen(): Observable<void> {
    return this.afterOpened();
  }

  /**
   * Gets an observable that is notified when the dialog has started closing.
   * @deprecated Use `beforeClosed` instead.
   * @breaking-change 8.0.0
   */
  beforeClose(): Observable<R | undefined> {
    return this.beforeClosed();
  }

  /** Fetches the position strategy object from the overlay ref. */
  private _getPositionStrategy(): GlobalPositionStrategy {
    return this._overlayRef.getConfig().positionStrategy as GlobalPositionStrategy;
  }
}

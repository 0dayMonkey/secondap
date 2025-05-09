import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';

@Injectable()
export class AnimationService {
  private animationStarted = false;
  private animatedItems: boolean[] = [];

  constructor(private appConfigService: AppConfigService) {}

  animateItem(index: number): boolean {
    return this.animatedItems[index] === true;
  }

  startCascadeAnimation(itemCount: number): Promise<number> {
    if (this.animationStarted) {
      return Promise.resolve(0);
    }
    const animConfig = this.appConfigService.config.animations;

    return new Promise((resolve) => {
      this.animationStarted = true;
      this.animatedItems = [];

      const maxVisibleItems = animConfig.maxVisibleItemsForCascade;
      const totalItems = 1 + itemCount;
      const itemsToAnimateIndividually =
        Math.min(totalItems - 1, maxVisibleItems) + 1;

      for (let i = 0; i < totalItems; i++) {
        if (i >= itemsToAnimateIndividually) {
          this.animatedItems[i] = true;
        } else {
          this.animatedItems[i] = false;
        }
      }

      for (let i = 0; i < itemsToAnimateIndividually; i++) {
        setTimeout(() => {
          this.animatedItems[i] = true;
          if (i === itemsToAnimateIndividually - 1) {
            resolve(itemsToAnimateIndividually);
          }
        }, i * animConfig.itemDelay);
      }
    });
  }

  startReverseCascadeAnimation(itemCount: number): Promise<number> {
    const animConfig = this.appConfigService.config.animations;
    return new Promise((resolve) => {
      this.animatedItems = [];

      const maxVisibleItems = animConfig.maxVisibleItemsForCascade;
      const totalItems = 1 + itemCount;
      const itemsToAnimateIndividually =
        Math.min(totalItems - 1, maxVisibleItems) + 1;

      for (let i = 0; i < totalItems; i++) {
        this.animatedItems[i] = false;
      }

      for (let i = 0; i < itemsToAnimateIndividually; i++) {
        setTimeout(() => {
          if (i === 0) {
            this.animationStarted = false;
            resolve(itemsToAnimateIndividually);
          }
        }, i * animConfig.returnItemDelay);
      }
    });
  }

  resetAnimation(): void {
    this.animationStarted = false;
    this.animatedItems = [];
  }

  applyClickAnimation(element: HTMLElement): void {
    element.classList.add('animating');
    setTimeout(() => {
      element.classList.remove('animating');
    }, this.appConfigService.config.animations.clickFeedbackDuration);
  }
}

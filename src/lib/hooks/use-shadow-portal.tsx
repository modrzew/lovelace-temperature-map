import { useEffect } from 'react';
import { useState } from 'react';
import styles from '../../index.css?inline';

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

export const useShadowPortal = () => {
  const [shadowPortal, setShadowPortal] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const portalDiv = document.createElement('div');
    document.body.appendChild(portalDiv);
    const shadowRoot = portalDiv.attachShadow({ mode: 'open' });
    shadowRoot.adoptedStyleSheets = [styleSheet];
    setShadowPortal(shadowRoot);

    return () => {
      document.body.removeChild(portalDiv);
    };
  }, []);

  return shadowPortal;
};

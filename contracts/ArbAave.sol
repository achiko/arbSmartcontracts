// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.6;

import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

import { FlashLoanReceiverBase } from "./Interfaces/FlashLoanReceiverBase.sol";
import { ILendingPool, ILendingPoolAddressesProvider, IERC20 } from "./Interfaces/Interfaces.sol";
import { SafeERC20 } from "./Interfaces/Libraries.sol";


contract ArbAave is FlashLoanReceiverBase {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    struct LocalVars {
        
        address _tradeToken;
        IERC20 _tradeTokenContract;
        uint _tradeTokeDecimals;
        string _tradeTokenSymbol;

        address _pair1;
        address _pair2; 
        address _router1;
        address _router2;
        uint _amount;
        
        address token0;
        address token1;

        address token10;
        address token11;

        uint256 amountReceived;
        uint256 amountReceived1;
        uint256 amountOwing;
    }

    constructor(ILendingPoolAddressesProvider _addressProvider) public FlashLoanReceiverBase(_addressProvider) {}

    /**
        This function is called after your contract has received the flash loaned amount
    */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        LocalVars memory vars;

        // LocalVars memory vars;

        (
            vars._tradeToken,
            vars._pair1,
            vars._pair2,
            vars._router1,
            vars._router2,
            vars._amount
        ) = abi.decode(params, (address, address, address, address, address, uint));

        // vars.amountOwing = amounts[0].add(premiums[0]);    
        // Rmoved Safe Math
        vars.amountOwing = amounts[0] + premiums[0];
        
        IUniswapV2Router02 pair1Router = IUniswapV2Router02(vars._router1);

        vars.token0 = IUniswapV2Pair(vars._pair1).token0();
        vars.token1 = IUniswapV2Pair(vars._pair1).token1();

        address[] memory path = new address[](2);

        path[0] = vars.token0 == vars._tradeToken ? vars.token0 : vars.token1;
        path[1] = vars.token1 == vars._tradeToken ? vars.token0 : vars.token1;

        IERC20(path[0]).approve(vars._router1, vars._amount);

        vars.amountReceived = pair1Router.swapExactTokensForTokens(
          vars._amount, 
          0, 
          path, 
          address(this), 
          block.timestamp + 120 seconds
        )[1];
        // Init Router 2 
        IUniswapV2Router02 pair2Router = IUniswapV2Router02(vars._router2);

        IERC20(path[0]).safeApprove(vars._router2, vars.amountReceived);
        IERC20(path[1]).safeApprove(vars._router2, vars.amountReceived);

        address[] memory path1 = new address[](2);

        path1[0] = path[1];
        path1[1] = path[0];


        // reverse path
        vars.amountReceived1 = pair2Router.swapExactTokensForTokens(
          vars.amountReceived, 
          0, 
          path1, 
          address(this), 
          block.timestamp + 120 seconds
        )[1];

        vars._tradeTokenContract = IERC20(vars._tradeToken);
        vars._tradeTokeDecimals = vars._tradeTokenContract.decimals();
        vars._tradeTokenSymbol = vars._tradeTokenContract.symbol();

        IERC20(vars._tradeToken).safeApprove(address(LENDING_POOL), vars.amountOwing);

        return true;
    }


    // TODO: Store routers in storage
    function flashloanCall(address _tradeToken, address _pair1, address _pair2, address _router1, address _router2, uint _amount) public {

        bytes memory data = abi.encode(
            _tradeToken,
            _pair1,
            _pair2,
            _router1,
            _router2,
            _amount
        );

        // Get Lending Asset Address from cTokencontract (uinderlying)
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = _tradeToken; // Borrow repay amount

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _amount;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params = data;
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
    }
}

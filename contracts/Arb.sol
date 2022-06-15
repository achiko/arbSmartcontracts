// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.6;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IERC20 } from "./Interfaces/Interfaces.sol";
import { SafeMath, SafeERC20 } from "./Interfaces/Libraries.sol";


contract Arb  {
    using SafeERC20 for IERC20;

    uint256 constant private MAX_INT = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
    address private _owner;
    
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }
    
    constructor() public {
      address msgSender = msg.sender;
        _owner = msgSender;
    }

    fallback() external payable {}

    function startArbitrage(
        address _token1,
        address _token2,
        address _router1,
        address _router2,
        uint _amount
    ) public returns (uint) {

        uint gasOnStart = gasleft();
        
        address[] memory path = new address[](2);
        path[0] = _token1;
        path[1] = _token2;

        IUniswapV2Router02 pair1Router = IUniswapV2Router02(_router1);

        if (IERC20(_token1).allowance(address(this), _router1) < _amount) {
            IERC20(_token1).approve(_router1, MAX_INT);
        }

        uint amountReceived1 = pair1Router.swapExactTokensForTokens(
          _amount, 
          0, 
          path, 
          address(this), 
          block.timestamp + 120 seconds
        )[1];

        IUniswapV2Router02 pair2Router = IUniswapV2Router02(_router2);

        address[] memory path1 = new address[](2);
        path1[0] = _token2;
        path1[1] = _token1;
        
        if (IERC20(_token2).allowance(address(this), _router2) < amountReceived1 * 2) {
            IERC20(_token2).approve(_router2, MAX_INT);
        }
        
        uint amountReceived2 = pair2Router.swapExactTokensForTokens(
          amountReceived1, 
          0, 
          path1, 
          address(this), 
          block.timestamp + 120 seconds
        )[1];


        uint gasSpent = gasOnStart -  gasleft();
        
        require(amountReceived2 - gasSpent > _amount);

        return amountReceived1;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getContractErc20Balance(address _underlyingAddress)
        public
        view
        returns (address _erc20Address, uint256 _balance)
    {
        _balance = IERC20(_underlyingAddress).balanceOf(address(this));
        _erc20Address = _underlyingAddress;
    }

    function transferAllErc20Tokens(address _erc20address, address _to)
        public
        onlyOwner
        returns (bool result)
    {
        uint256 erc20Balance = IERC20(_erc20address).balanceOf(address(this));
        require(erc20Balance > 0, "NOT ENOUGH BALANCE");
        result = IERC20(_erc20address).transfer(_to, erc20Balance);
    }
}
